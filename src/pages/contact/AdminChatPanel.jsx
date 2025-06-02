import React, { useState, useEffect, useRef, useContext } from 'react'
import { db } from '../../firebase/firebase'
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  where,
  doc,
  updateDoc,
  writeBatch,
  getDocs,
} from 'firebase/firestore'
import { AuthContext } from '../../contexts/AuthContext'

const AdminChatPanel = () => {
  const { user, userData, loading: authLoading } = useContext(AuthContext)
  const [activeChats, setActiveChats] = useState([])
  const [selectedChat, setSelectedChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const [unreadCounts, setUnreadCounts] = useState({})

  // Verificar si el usuario es administrador
  useEffect(() => {
    if (!authLoading) {
      console.log('Estado de usuario:', {
        isAdmin: userData?.role === 'admin',
        role: userData?.role,
        uid: user?.uid,
      })

      if (userData?.role !== 'admin') {
        console.error(
          'Acceso denegado: Necesitas ser administrador para acceder a este panel'
        )
      }
    }
  }, [userData, authLoading, user])

  // Cargar chats activos y contar mensajes no leídos
  useEffect(() => {
    if (authLoading || userData?.role !== 'admin') return

    console.log('Iniciando carga de chats activos como admin')
    setLoading(true)

    try {
      const chatsQuery = query(
        collection(db, 'chats'),
        where('isActive', '==', true)
      )

      console.log('Ejecutando consulta de chats activos')

      const unsubscribe = onSnapshot(
        chatsQuery,
        (snapshot) => {
          console.log(`Recibidos ${snapshot.docs.length} chats activos`)

          const chatsList = []
          snapshot.forEach((doc) => {
            chatsList.push({ id: doc.id, ...doc.data() })
            console.log('Chat encontrado:', doc.id, doc.data().userInfo?.name)

            // Contar mensajes no leídos para este chat
            fetchUnreadCount(doc.id)
          })

          setActiveChats(chatsList)
          setLoading(false)
        },
        (error) => {
          console.error('Error al cargar chats:', error)
          setLoading(false)
        }
      )

      return () => unsubscribe()
    } catch (error) {
      console.error('Error al configurar la consulta de chats:', error)
      setLoading(false)
    }
  }, [authLoading, userData, user])

  // Función para obtener el conteo de mensajes no leídos
  const fetchUnreadCount = async (chatId) => {
    try {
      const unreadQuery = query(
        collection(db, `chats/${chatId}/messages`),
        where('sender', '==', 'user'),
        where('isRead', '==', false)
      )

      const snapshot = await getDocs(unreadQuery)
      setUnreadCounts((prev) => ({
        ...prev,
        [chatId]: snapshot.size,
      }))
    } catch (error) {
      console.error(
        `Error al contar mensajes no leídos para chat ${chatId}:`,
        error
      )
    }
  }

  // Cargar mensajes del chat seleccionado
  useEffect(() => {
    if (!selectedChat) return

    setLoading(true)
    const messagesQuery = query(
      collection(db, `chats/${selectedChat.id}/messages`),
      orderBy('createdAt', 'asc')
    )

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const messagesList = []
        snapshot.forEach((doc) => {
          messagesList.push({ id: doc.id, ...doc.data() })
        })
        setMessages(messagesList)
        setLoading(false)

        // Marcar mensajes del usuario como leídos al verlos
        markUserMessagesAsRead(selectedChat.id, messagesList)
      },
      (error) => {
        console.error('Error al cargar mensajes:', error)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [selectedChat])

  // Marcar mensajes del usuario como leídos
  const markUserMessagesAsRead = async (chatId, messagesList) => {
    try {
      const batch = writeBatch(db)
      let hasUnreadMessages = false

      messagesList.forEach((message) => {
        if (message.sender === 'user' && !message.isRead) {
          const messageRef = doc(db, `chats/${chatId}/messages/${message.id}`)
          batch.update(messageRef, { isRead: true })
          hasUnreadMessages = true
        }
      })

      if (hasUnreadMessages) {
        await batch.commit()
        console.log('Mensajes marcados como leídos')

        // Actualizar contador de no leídos
        setUnreadCounts((prev) => ({
          ...prev,
          [chatId]: 0,
        }))
      }
    } catch (error) {
      console.error('Error al marcar mensajes como leídos:', error)
    }
  }

  // Auto-scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Enviar mensaje como soporte
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedChat) return

    try {
      await addDoc(collection(db, `chats/${selectedChat.id}/messages`), {
        text: newMessage.trim(),
        sender: 'support',
        createdAt: serverTimestamp(),
        isRead: false,
      })

      setNewMessage('')
    } catch (error) {
      console.error('Error al enviar mensaje:', error)
    }
  }

  // Marcar chat como inactivo/cerrado
  const closeChat = async (chatId) => {
    try {
      await updateDoc(doc(db, 'chats', chatId), {
        isActive: false,
      })

      if (selectedChat && selectedChat.id === chatId) {
        setSelectedChat(null)
      }
    } catch (error) {
      console.error('Error al cerrar chat:', error)
    }
  }

  // Formatear la hora del mensaje
  const formatTime = (timestamp) => {
    if (!timestamp || !timestamp.toDate) {
      return ''
    }
    return timestamp.toDate().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Formatear la fecha
  const formatDate = (timestamp) => {
    if (!timestamp || !timestamp.toDate) {
      return ''
    }
    return timestamp.toDate().toLocaleDateString()
  }

  if (authLoading) {
    return <div className="p-4">Cargando...</div>
  }

  if (userData?.role !== 'admin') {
    return <div className="p-4 text-red-500">Acceso denegado</div>
  }

  return (
    <div className="h-auto w-[92%] mx-auto pb-[4vh] sm:pb-[6vh]">
      <h1 className="mb-[5vh] sm:mb-[8vh] overflow-hidden text-center sm:t64b t40b whitespace-break-spaces">
        Panel de Administración de Chat
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-[1.5rem] justify-items-center md:justify-items-start">
        {/* Lista de chats activos */}
        <div className="md:col-span-2 w-full max-w-[90vw] md:max-w-full">
          <div className="space-y-[1rem] bg-[#D9D9D9] rounded-[2rem] sm:rounded-[3rem] h-fit w-full mb-[1.5rem] text-black backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)]">
            <h3 className="pt-[1rem] pl-[1.5rem] sm:pl-[2rem] t36b sm:t40b">
              Conversaciones activas ({activeChats.length})
            </h3>
            <div className="px-[0.5rem] pb-[1rem] h-[calc(70vh-200px)] overflow-y-auto">
              {loading && activeChats.length === 0 ? (
                <div className="p-4 text-center text-gray-500 t18r">
                  Cargando chats...
                </div>
              ) : activeChats.length === 0 ? (
                <div className="p-4 text-center text-gray-500 t18r">
                  No hay conversaciones activas
                </div>
              ) : (
                <ul className="space-y-[0.5rem]">
                  {activeChats.map((chat) => (
                    <li
                      key={chat.id}
                      onClick={() => setSelectedChat(chat)}
                      className={`p-4 cursor-pointer hover:bg-gray-100 transition-colors duration-200 rounded-[1rem] ${
                        selectedChat?.id === chat.id
                          ? 'bg-blue-50 shadow-md'
                          : 'bg-white bg-opacity-50'
                      } relative`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center t20b">
                          {chat.userInfo?.name || 'Usuario'}
                          {unreadCounts[chat.id] > 0 && (
                            <span className="inline-flex items-center justify-center px-2 py-1 ml-2 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                              {unreadCounts[chat.id]}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDate(chat.createdAt)}
                        </div>
                      </div>
                      <div className="mt-1 text-gray-600 t14r">
                        {chat.userInfo?.email || 'Sin email'}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Panel de chat */}
        <div className="md:col-span-3 w-full max-w-[90vw] md:max-w-full">
          <div className="bg-[#D9D9D9] rounded-[2rem] sm:rounded-[3rem] h-full w-full mb-[1.5rem] text-black backdrop-blur-lg backdrop-saturate-[180%] bg-[rgba(255,255,255,0.75)] flex flex-col">
            {selectedChat ? (
              <>
                <div className="flex items-center justify-between p-4 border-b bg-white bg-opacity-30 rounded-t-[2rem] sm:rounded-t-[3rem]">
                  <div>
                    <h2 className="t24b">
                      {selectedChat.userInfo?.name || 'Usuario'}
                    </h2>
                    <div className="text-gray-600 t16r">
                      {selectedChat.userInfo?.email || 'Sin email'}
                    </div>
                  </div>
                  <button
                    onClick={() => closeChat(selectedChat.id)}
                    className="px-4 py-2 text-white transition-colors bg-red-500 rounded-full hover:bg-red-600 t14b"
                  >
                    Cerrar chat
                  </button>
                </div>

                <div className="flex-grow p-4 overflow-y-auto bg-white bg-opacity-30 h-[calc(70vh-280px)]">
                  {loading ? (
                    <div className="text-center text-gray-500 t18r">
                      Cargando mensajes...
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`max-w-[80%] clear-both ${
                            message.sender === 'support'
                              ? 'float-right bg-blue-100 rounded-tl-[1rem] rounded-tr-[1rem] rounded-bl-[1rem] ml-auto'
                              : 'float-left bg-gray-100 rounded-tr-[1rem] rounded-tl-[1rem] rounded-br-[1rem] mr-auto'
                          } p-3 relative shadow-sm`}
                        >
                          <div className="t18r">{message.text}</div>
                          <div className="flex items-center justify-end mt-1 space-x-1 text-xs text-gray-500">
                            <span>{formatTime(message.createdAt)}</span>
                            {message.sender === 'support' && (
                              <span className="ml-1">
                                {message.isRead ? (
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="text-blue-500"
                                  >
                                    <path d="M18 6L7 17L2 12" />
                                  </svg>
                                ) : (
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="text-gray-400"
                                  >
                                    <path d="M5 12h14" />
                                  </svg>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                      <div
                        ref={messagesEndRef}
                        className="h-[1px] clear-both"
                      />
                    </div>
                  )}
                </div>

                <form
                  className="p-4 bg-white bg-opacity-50 border-t rounded-b-[2rem] sm:rounded-b-[3rem]"
                  onSubmit={handleSubmit}
                >
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Escribe un mensaje..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-1 p-3 border-2 border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-300 t16r"
                    />
                    <button
                      type="submit"
                      className="bg-[#0078d7] text-white px-6 py-3 rounded-full hover:bg-[#005fa3] transition-colors t16b shadow-md hover:shadow-lg"
                      disabled={loading}
                    >
                      Enviar
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex items-center justify-center h-[70vh] text-gray-500 t24r">
                Selecciona un chat para comenzar
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminChatPanel
