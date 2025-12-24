import Peer, { DataConnection } from 'peerjs'

export type MessageType = 'move' | 'chat' | 'ready' | 'restart' | 'surrender' | 'leave' | 'pass'

export interface PeerMessage {
  type: MessageType
  payload: unknown
  timestamp: number
}

export class PeerManager {
  private peer: Peer | null = null
  private connection: DataConnection | null = null
  private peerId: string = ''
  private onMessageCallback: ((message: PeerMessage) => void) | null = null
  private onConnectedCallback: (() => void) | null = null
  private onDisconnectedCallback: (() => void) | null = null

  // 피어 생성 (호스트용)
  async createPeer(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.peer = new Peer()

      this.peer.on('open', (id) => {
        console.log('[PeerManager] Peer created with ID:', id)
        this.peerId = id
        resolve(id)
      })

      this.peer.on('connection', (conn) => {
        console.log('[PeerManager] Incoming connection from:', conn.peer)
        this.connection = conn
        this.setupConnectionHandlers()
      })

      this.peer.on('error', (err) => {
        console.error('[PeerManager] Peer error:', err)
        reject(err)
      })
    })
  }

  // 피어에 연결 (게스트용)
  async connectToPeer(hostPeerId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.peer = new Peer()

      this.peer.on('open', (myId) => {
        console.log('[PeerManager] Guest peer opened with ID:', myId)
        this.peerId = myId

        console.log('[PeerManager] Connecting to host:', hostPeerId)
        this.connection = this.peer!.connect(hostPeerId, {
          reliable: true
        })

        this.connection.on('open', () => {
          console.log('[PeerManager] Connected to host, connection open')
          this.setupConnectionHandlers()
          // 게스트 측: 연결이 열리면 바로 콜백 호출
          if (this.onConnectedCallback) {
            console.log('[PeerManager] Guest calling onConnected callback')
            this.onConnectedCallback()
          }
          resolve()
        })

        this.connection.on('error', (err) => {
          console.error('[PeerManager] Connection error:', err)
          reject(err)
        })
      })

      this.peer.on('error', (err) => {
        console.error('[PeerManager] Peer error:', err)
        reject(err)
      })
    })
  }

  // 연결 핸들러 설정
  private setupConnectionHandlers() {
    if (!this.connection) return

    this.connection.on('data', (data) => {
      console.log('[PeerManager] Data received:', data)
      if (this.onMessageCallback) {
        this.onMessageCallback(data as PeerMessage)
      }
    })

    // 호스트 측: 연결이 열릴 때 콜백 호출
    this.connection.on('open', () => {
      console.log('[PeerManager] Connection opened (host side)')
      if (this.onConnectedCallback) {
        console.log('[PeerManager] Host calling onConnected callback')
        this.onConnectedCallback()
      }
    })

    this.connection.on('close', () => {
      console.log('[PeerManager] Connection closed')
      if (this.onDisconnectedCallback) {
        this.onDisconnectedCallback()
      }
    })

    this.connection.on('error', (err) => {
      console.error('[PeerManager] Connection error:', err)
    })

    // 이미 연결이 열려있는 경우 (호스트 측에서 이미 open일 수 있음)
    if (this.connection.open && this.onConnectedCallback) {
      console.log('[PeerManager] Connection already open, calling callback')
      this.onConnectedCallback()
    }
  }

  // 메시지 전송
  sendMessage(type: MessageType, payload: unknown): boolean {
    if (!this.connection || !this.connection.open) {
      console.error('[PeerManager] No open connection to send message')
      return false
    }

    const message: PeerMessage = {
      type,
      payload,
      timestamp: Date.now()
    }

    try {
      this.connection.send(message)
      console.log('[PeerManager] Message sent:', type)
      return true
    } catch (error) {
      console.error('[PeerManager] Send error:', error)
      return false
    }
  }

  // 콜백 설정
  onMessage(callback: (message: PeerMessage) => void) {
    this.onMessageCallback = callback
  }

  onConnected(callback: () => void) {
    this.onConnectedCallback = callback
  }

  onDisconnected(callback: () => void) {
    this.onDisconnectedCallback = callback
  }

  // 연결 상태 확인
  isConnected(): boolean {
    return this.connection !== null && this.connection.open
  }

  // Peer ID 반환
  getPeerId(): string {
    return this.peerId
  }

  // 연결 종료
  disconnect() {
    if (this.connection) {
      this.connection.close()
      this.connection = null
    }
    if (this.peer) {
      this.peer.destroy()
      this.peer = null
    }
    this.peerId = ''
    console.log('[PeerManager] Disconnected')
  }
}

// 싱글톤 인스턴스 생성 함수
export const createPeerManager = () => new PeerManager()
