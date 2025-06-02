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
} from 'firebase/firestore'
import { AuthContext } from '../../contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import DynamicButton from '../../components/Buttons'

const LiveChat = () => {
  const { user, userData, loading: authLoading } = useContext(AuthContext)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [chatId, setChatId] = useState(null)
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const userId = user ? user.uid : null
  const userInfo = user
    ? {
        id: user.uid,
        name: user.displayName || user.email,
        email: user.email,
        role: userData?.role || 'user',
      }
    : null

  useEffect(() => {
    if (isOpen && !chatId && !authLoading && user) {
      const generateChatId = async () => {
        const userChatsQuery = query(
          collection(db, 'chats'),
          where('userId', '==', userId),
          where('isActive', '==', true)
        )

        const unsubscribe = onSnapshot(userChatsQuery, (snapshot) => {
          unsubscribe()
          if (snapshot.empty) {
            createNewChat()
          } else {
            setChatId(snapshot.docs[0].id)
          }
        })
      }

      generateChatId()
    }
  }, [isOpen, chatId, userId, authLoading])

  const createNewChat = async () => {
    try {
      const chatRef = await addDoc(collection(db, 'chats'), {
        userId,
        userInfo,
        createdAt: serverTimestamp(),
        isActive: true,
      })
      setChatId(chatRef.id)

      await addDoc(collection(db, `chats/${chatRef.id}/messages`), {
        text: `¡Hola ${userInfo.name}! ¿En qué podemos ayudarte hoy?`,
        sender: 'support',
        createdAt: serverTimestamp(),
        isRead: false,
      })
    } catch (error) {
      console.error('Error al crear chat:', error)
    }
  }

  useEffect(() => {
    if (!isOpen || !chatId) return

    setLoading(true)
    console.log(`Escuchando mensajes para chat ${chatId}`)

    const messagesQuery = query(
      collection(db, `chats/${chatId}/messages`),
      orderBy('createdAt', 'asc')
    )

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const messagesList = []
        snapshot.forEach((doc) => {
          messagesList.push({ id: doc.id, ...doc.data() })
        })
        console.log(`Recibidos ${messagesList.length} mensajes`)
        setMessages(messagesList)
        setLoading(false)
      },
      (error) => {
        console.error('Error al obtener mensajes:', error)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [chatId, isOpen])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !chatId) return

    try {
      await addDoc(collection(db, `chats/${chatId}/messages`), {
        text: newMessage.trim(),
        sender: 'user',
        userId,
        userInfo,
        createdAt: serverTimestamp(),
        isRead: false,
      })

      setNewMessage('')
    } catch (error) {
      console.error('Error al enviar mensaje:', error)
    }
  }

  const toggleChat = () => {
    setIsOpen(!isOpen)
  }

  const formatTime = (timestamp) => {
    if (!timestamp || !timestamp.toDate) {
      return ''
    }
    return timestamp.toDate().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  useEffect(() => {
    if (!isOpen && messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.sender === 'support' && !lastMessage.isRead) {
        const chatButton = document.querySelector('.chat-toggle-button')
        if (chatButton) {
          chatButton.classList.add('animate-pulse')
        }
      }
    } else {
      const markMessagesAsRead = async () => {
        if (!chatId) return

        const unreadMessages = messages.filter(
          (message) => message.sender === 'support' && !message.isRead
        )

        for (const message of unreadMessages) {
          try {
            const messageRef = doc(db, `chats/${chatId}/messages`, message.id)
            await updateDoc(messageRef, { isRead: true })
          } catch (error) {
            console.error('Error al marcar mensaje como leído:', error)
          }
        }
      }

      markMessagesAsRead()
    }
  }, [isOpen, messages, chatId])

  const navigateToRegister = () => {
    window.location.href = '/register'
  }

  const navigateToLogin = () => {
    window.location.href = '/login'
  }

  return (
    <div className="fixed bottom-[20px] right-[20px] z-[1000] font-sans">
      {!user && isOpen ? (
        <div className="w-[320px] sm:w-[350px] bg-white bg-opacity-75 backdrop-blur-lg backdrop-saturate-[180%] rounded-xl shadow-lg flex flex-col overflow-hidden transition-all duration-300 ease-in-out">
          <div className=" text-black p-[10px] flex justify-between items-center">
            <h3 className="m-0 t16b">Chat de soporte</h3>
            <button
              className="text-2xl leading-none text-black bg-transparent border-none cursor-pointer hover:text-gray-200 focus:outline-none"
              onClick={toggleChat}
              aria-label="Cerrar chat"
            >
              ×
            </button>
          </div>
          <div className="p-[20px] flex flex-col items-center text-center">
            <h2 className="mb-3 text-xl font-bold text-gray-800">
              {t('common.authRequired.title') || 'Autenticación requerida'}
            </h2>

            <div className="mb-4 text-base">
              <p className="mb-2">
                {t('common.authRequired.text') ||
                  'Para utilizar el chat de soporte, necesitas iniciar sesión en tu cuenta.'}
              </p>
            </div>

            <div className="flex flex-col justify-center w-full space-y-3 sm:w-auto sm:flex-row sm:space-y-0 sm:space-x-3">
              <DynamicButton
                size="small"
                state="normal"
                type="personAdd"
                onClick={navigateToRegister}
                textId="common.register"
              />

              <DynamicButton
                size="small"
                state="highlighted"
                onClick={navigateToLogin}
                textId="common.login"
              />
            </div>
          </div>
        </div>
      ) : isOpen ? (
        <div className="w-[320px] sm:w-[350px] h-[450px] bg-white rounded-lg shadow-lg flex flex-col overflow-hidden transition-all duration-300 ease-in-out">
          <div className="bg-black text-white p-[10px] flex justify-between items-center">
            <h3 className="m-0 t16b">Chat de soporte</h3>
            <button
              className="text-2xl leading-none text-white bg-transparent border-none cursor-pointer hover:text-gray-200 focus:outline-none"
              onClick={toggleChat}
              aria-label="Cerrar chat"
            >
              ×
            </button>
          </div>

          <div className="flex-1 p-[10px] overflow-y-auto bg-gray-50">
            {authLoading || loading ? (
              <div className="flex items-center justify-center h-full text-gray-500 t14r">
                Cargando mensajes...
              </div>
            ) : (
              <div className="space-y-[10px]">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`max-w-[80%] clear-both ${
                      message.sender === 'user'
                        ? 'float-right bg-blue-100 rounded-tl-lg rounded-tr-lg rounded-bl-lg ml-auto'
                        : 'float-left bg-gray-200 rounded-tr-lg rounded-tl-lg rounded-br-lg mr-auto'
                    } p-[10px] relative`}
                  >
                    <div className="t14r">{message.text}</div>
                    <div className="t10r text-gray-500 text-right mt-[3px]">
                      {formatTime(message.createdAt)}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} className="h-[1px]" />
              </div>
            )}
          </div>

          <form
            className="p-[10px] border-t border-gray-200 bg-white flex gap-[10px]"
            onSubmit={handleSubmit}
          >
            <input
              type="text"
              placeholder="Escribe un mensaje..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 p-[8px] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300"
              disabled={authLoading || loading}
            />
            <button
              type="submit"
              className={`bg-black text-white px-[15px] py-[8px] rounded-md t14b ${
                authLoading || loading
                  ? 'opacity-50 cursor-not-allowed'
                  : ' transition-colors'
              }`}
              disabled={authLoading || loading}
            >
              Enviar
            </button>
          </form>
        </div>
      ) : (
        <button
          className={`w-[60px] h-[60px] bg-black text-white rounded-full shadow-lg flex items-center justify-center text-2xl chat-toggle-button ${
            authLoading
              ? 'opacity-50 cursor-not-allowed'
              : ' transition-all duration-300 hover:scale-105'
          }`}
          onClick={toggleChat}
          disabled={authLoading}
          aria-label="Abrir chat"
        >
          💬
        </button>
      )}
    </div>
  )
}

export default LiveChat
