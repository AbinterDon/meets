package websocket

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"meets/server/internal/usecase"

	"github.com/gorilla/websocket"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 512
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type WSMessage struct {
	Type    string `json:"type"`
	Content string `json:"content"`
	From    string `json:"from"`
	To      string `json:"to"`
}

type Hub struct {
	clients     map[string]*Client
	broadcast   chan WSMessage
	register    chan *Client
	unregister  chan *Client
	chatUsecase *usecase.ChatUsecase
}

func NewHub(chatUsecase *usecase.ChatUsecase) *Hub {
	return &Hub{
		broadcast:   make(chan WSMessage),
		register:    make(chan *Client),
		unregister:  make(chan *Client),
		clients:     make(map[string]*Client),
		chatUsecase: chatUsecase,
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			if client.ID != "" {
				h.clients[client.ID] = client
				log.Printf("User logged in: %s", client.ID)
			}
		case client := <-h.unregister:
			if client.ID != "" {
				if _, ok := h.clients[client.ID]; ok {
					delete(h.clients, client.ID)
					close(client.send)
				}
			}
		case message := <-h.broadcast:
			// Save to DB (Async via Usecase)
			if message.To != "" {
				go func(m WSMessage) {
					if err := h.chatUsecase.SaveMessage(context.Background(), m.From, m.To, m.Content); err != nil {
						log.Printf("Error saving message: %v", err)
					}
				}(message)
			}

			bytes, _ := json.Marshal(message)

			// Send to Receiver (Private)
			if message.To != "" {
				if client, ok := h.clients[message.To]; ok {
					select {
					case client.send <- bytes:
					default:
						close(client.send)
						delete(h.clients, message.To)
					}
				}
			} else {
				// Broadcast (Public)
				for id, client := range h.clients {
					if id == message.From {
						continue
					}
					select {
					case client.send <- bytes:
					default:
						close(client.send)
						delete(h.clients, id)
					}
				}
			}
		}
	}
}

type Client struct {
	hub  *Hub
	conn *websocket.Conn
	send chan []byte
	ID   string
}

func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()
	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error { c.conn.SetReadDeadline(time.Now().Add(pongWait)); return nil })
	for {
		var msg WSMessage
		err := c.conn.ReadJSON(&msg)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}
		msg.From = c.ID
		if msg.Type == "login" {
			c.ID = msg.Content
			c.hub.register <- c
			continue
		}
		c.hub.broadcast <- msg
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()
	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)
			n := len(c.send)
			for i := 0; i < n; i++ {
				w.Write(<-c.send)
			}
			if err := w.Close(); err != nil {
				return
			}
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func ServeWs(hub *Hub, w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}
	client := &Client{hub: hub, conn: conn, send: make(chan []byte, 256)}
	go client.writePump()
	go client.readPump()
}
