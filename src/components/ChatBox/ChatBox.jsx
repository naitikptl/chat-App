import React, { useContext, useEffect, useRef, useState } from 'react'
import './ChatBox.css'
import assets from '../../assets/assets'
import { AppContext } from '../../context/AppContext';
import { arrayUnion, doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { toast } from 'react-toastify';
import upload from '../../lib/upload';
import VideoChat from './VideoChat';
import EmojiPicker from 'emoji-picker-react';
import VoiceChat from './VoiceChat';

const ChatBox = () => {

  
  const { userData, messagesId, chatUser,messages,setMessages, chatVisible, setChatVisible } = useContext(AppContext);
  const [input, setInput] = useState("");
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [callStatus, setCallStatus] = useState(null); // 'calling', 'ongoing', 'ended'
  const longPressTimer = useRef(null);
  const scrollEnd = useRef();
  const emojiPickerRef = useRef(null);
  const [isVoiceCallActive, setIsVoiceCallActive] = useState(false);
  const [callType, setCallType] = useState(null); // 'video' or 'voice'
  const [previewImage, setPreviewImage] = useState(null);

  const sendMessage = async () => {

    try {

      if (input && messagesId) {
        await updateDoc(doc(db, "messages", messagesId), {
          messages: arrayUnion({
            sId: userData.id,
            text: input,
            createdAt: new Date()
          })
        })

        const userIDs = [chatUser.rId, userData.id];

        userIDs.forEach(async (id) => {
          const userChatsRef = doc(db, "chats", id);
          const userChatsSnapshot = await getDoc(userChatsRef);

          if (userChatsSnapshot.exists()) {
            const userChatsData = userChatsSnapshot.data();
            const chatIndex = userChatsData.chatsData.findIndex((c) => c.messageId === messagesId);
            userChatsData.chatsData[chatIndex].lastMessage = input;
            userChatsData.chatsData[chatIndex].updatedAt = Date.now();
            if (userChatsData.chatsData[chatIndex].rId == userData.id) {
              userChatsData.chatsData[chatIndex].messageSeen = false;
            }
            await updateDoc(userChatsRef, {
              chatsData: userChatsData.chatsData,
            });
          }
        })
      }

    } catch (error) {
      toast.error(error.message)
    }

    setInput("")

  }

  const convertTimestamp = (timestamp) => {
    let date = timestamp.toDate();
    const hour = date.getHours();
    const minute = date.getMinutes();
    if (hour > 12) {
      date = hour - 12 + ':' + minute + " PM";
    }
    else {
      date = hour + ':' + minute + " AM";
    }
    return date;
  }

  const sendImage = async (e) => {

    const fileUrl = await upload(e.target.files[0])

    if (fileUrl && messagesId) {
      await updateDoc(doc(db, "messages", messagesId), {
        messages: arrayUnion({
          sId: userData.id,
          image: fileUrl,
          createdAt: new Date()
        })
      })

      const userIDs = [chatUser.rId, userData.id];

      userIDs.forEach(async (id) => {
        const userChatsRef = doc(db, "chats", id);
        const userChatsSnapshot = await getDoc(userChatsRef);

        if (userChatsSnapshot.exists()) {
          const userChatsData = userChatsSnapshot.data();
          const chatIndex = userChatsData.chatsData.findIndex((c) => c.messageId === messagesId);
          userChatsData.chatsData[chatIndex].lastMessage = "Image";
          userChatsData.chatsData[chatIndex].updatedAt = Date.now();
          await updateDoc(userChatsRef, {
            chatsData: userChatsData.chatsData,
          });
        }
      })
    }
  }

  const handleMessagePress = (message, index) => {
    if (message.sId === userData.id) {
      longPressTimer.current = setTimeout(() => {
        setIsSelectionMode(true);
        setSelectedMessages([index]);
      }, 2000);
    }
  };

  const handleMessageRelease = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const toggleMessageSelection = (index) => {
    if (isSelectionMode) {
      setSelectedMessages(prev => {
        if (prev.includes(index)) {
          return prev.filter(i => i !== index);
        } else {
          return [...prev, index];
        }
      });
    }
  };

  const deleteSelectedMessages = async () => {
    try {
      if (messagesId && selectedMessages.length > 0) {
        const updatedMessages = messages.filter((_, index) => !selectedMessages.includes(index));
        
        await updateDoc(doc(db, "messages", messagesId), {
          messages: updatedMessages
        });
        
        setSelectedMessages([]);
        setIsSelectionMode(false);
        toast.success("Messages deleted successfully");
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const cancelSelection = () => {
    setSelectedMessages([]);
    setIsSelectionMode(false);
  };

  useEffect(() => {
    scrollEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages])

  useEffect(() => {
    if (messagesId) {
      const unSub = onSnapshot(doc(db, "messages", messagesId), (res) => {
        setMessages(res.data().messages.reverse());
      });
      return () => {
        unSub();
      };
    }

  }, [messagesId]);

  const startVideoCall = async () => {
    try {
      setIsVideoCallActive(true);
      setCallStatus('calling');
      
      // Add call notification message
      await updateDoc(doc(db, "messages", messagesId), {
        messages: arrayUnion({
          sId: userData.id,
          text: "📞 Started a video call",
          createdAt: new Date(),
          type: 'call_notification'
        })
      });

      // Update chat with call status
      const userIDs = [chatUser.rId, userData.id];
      userIDs.forEach(async (id) => {
        const userChatsRef = doc(db, "chats", id);
        const userChatsSnapshot = await getDoc(userChatsRef);

        if (userChatsSnapshot.exists()) {
          const userChatsData = userChatsSnapshot.data();
          const chatIndex = userChatsData.chatsData.findIndex((c) => c.messageId === messagesId);
          userChatsData.chatsData[chatIndex].lastMessage = "📞 Video call";
          userChatsData.chatsData[chatIndex].updatedAt = Date.now();
          await updateDoc(userChatsRef, {
            chatsData: userChatsData.chatsData,
          });
        }
      });
    } catch (error) {
      toast.error(error.message);
    }
  };

  const endVideoCall = async () => {
    try {
      setIsVideoCallActive(false);
      setCallStatus('ended');
      
      // Add call ended notification
      await updateDoc(doc(db, "messages", messagesId), {
        messages: arrayUnion({
          sId: userData.id,
          text: "📞 Video call ended",
          createdAt: new Date(),
          type: 'call_notification'
        })
      });

      // Update chat with call ended status
      const userIDs = [chatUser.rId, userData.id];
      userIDs.forEach(async (id) => {
        const userChatsRef = doc(db, "chats", id);
        const userChatsSnapshot = await getDoc(userChatsRef);

        if (userChatsSnapshot.exists()) {
          const userChatsData = userChatsSnapshot.data();
          const chatIndex = userChatsData.chatsData.findIndex((c) => c.messageId === messagesId);
          userChatsData.chatsData[chatIndex].lastMessage = "Last message";
          userChatsData.chatsData[chatIndex].updatedAt = Date.now();
          await updateDoc(userChatsRef, {
            chatsData: userChatsData.chatsData,
          });
        }
      });
    } catch (error) {
      toast.error(error.message);
    }
  };

  const startVoiceCall = async () => {
    try {
      setIsVoiceCallActive(true);
      setCallType('voice');
      setCallStatus('calling');
      
      // Add call notification message
      await updateDoc(doc(db, "messages", messagesId), {
        messages: arrayUnion({
          sId: userData.id,
          text: "📞 Started a voice call",
          createdAt: new Date(),
          type: 'call_notification'
        })
      });

      // Update chat with call status
      const userIDs = [chatUser.rId, userData.id];
      userIDs.forEach(async (id) => {
        const userChatsRef = doc(db, "chats", id);
        const userChatsSnapshot = await getDoc(userChatsRef);

        if (userChatsSnapshot.exists()) {
          const userChatsData = userChatsSnapshot.data();
          const chatIndex = userChatsData.chatsData.findIndex((c) => c.messageId === messagesId);
          userChatsData.chatsData[chatIndex].lastMessage = "📞 Voice call";
          userChatsData.chatsData[chatIndex].updatedAt = Date.now();
          await updateDoc(userChatsRef, {
            chatsData: userChatsData.chatsData,
          });
        }
      });
    } catch (error) {
      toast.error(error.message);
    }
  };

  const endCall = async () => {
    try {
      setIsVoiceCallActive(false);
      setIsVideoCallActive(false);
      setCallStatus('ended');
      setCallType(null);
      
      // Add call ended notification
      await updateDoc(doc(db, "messages", messagesId), {
        messages: arrayUnion({
          sId: userData.id,
          text: "📞 Call ended",
          createdAt: new Date(),
          type: 'call_notification'
        })
      });
    } catch (error) {
      toast.error(error.message);
    }
  };

  const onEmojiClick = (emojiObject) => {
    setInput(prev => prev + emojiObject.emoji);
  };

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const isEmojiOnly = (text) => {
    // Regular expression to match emoji characters
    const emojiRegex = /[\p{Emoji}\u{1F3FB}-\u{1F3FF}\u{1F9B0}-\u{1F9B3}]/gu;
    const emojis = text.match(emojiRegex) || [];
    return emojis.length > 0 && text.replace(emojiRegex, '').trim() === '';
  };

  const renderMessageContent = (msg) => {
    if (msg.type === 'call_notification') {
      return (
        <div className="call-notification">
          <span className="call-icon">{msg.text.includes('started') ? '📞' : '📞'}</span>
          <span className="call-text">{msg.text}</span>
        </div>
      );
    }
    
    if (msg["image"]) {
      return (
        <img 
          className='msg-img' 
          src={msg["image"]} 
          alt="" 
          onClick={() => setPreviewImage(msg["image"])}
        />
      );
    }
    
    if (isEmojiOnly(msg["text"])) {
      return <p className="msg emoji-only">{msg["text"]}</p>;
    }
    
    return <p className="msg">{msg["text"]}</p>;
  };

  return (
    <>
      {previewImage && (
        <div className="image-preview" onClick={() => setPreviewImage(null)}>
          <img src={previewImage} alt="" />
        </div>
      )}
      {isVoiceCallActive ? (
        <VoiceChat
          isCaller={true}
          onEndCall={endCall}
          remoteUserId={chatUser?.rId}
        />
      ) : isVideoCallActive ? (
        <VideoChat
          isCaller={true}
          onEndCall={endCall}
          remoteUserId={chatUser?.rId}
        />
      ) : chatUser ? (
        <div className={`chat-box ${chatVisible ? "" : "hidden"}`}>
          <div className="chat-user">
            <img src={chatUser ? chatUser.userData.avatar : assets.profile_img} alt="" />
            <p>{chatUser ? chatUser.userData.name : "Richard Sanford"} {Date.now() - chatUser.userData.lastSeen <= 70000 ? <img className='dot' src={assets.green_dot} alt='' /> : null}</p>
            <img onClick={()=>setChatVisible(false)} className='arrow' src={assets.arrow_icon} alt="" />
            <div className="call-buttons">
              <button onClick={startVoiceCall} className="voice-call-btn">
                📞
              </button>
              <button onClick={startVideoCall} className="video-call-btn">
                📹
              </button>
            </div>
            <img className='help' src={assets.help_icon} alt="" />
          </div>
          {isSelectionMode && (
            <div className="selection-toolbar">
              <span>{selectedMessages.length} selected</span>
              <button onClick={deleteSelectedMessages} className="delete-selected-btn">
                Delete Selected
              </button>
              <button onClick={cancelSelection} className="cancel-selection-btn">
                Cancel
              </button>
            </div>
          )}
          <div className="chat-msg">
            <div ref={scrollEnd}></div>
            {
              messages.map((msg, index) => {
                return (
                  <div 
                    key={index} 
                    className={`${msg.sId === userData.id ? "s-msg" : "r-msg"} ${selectedMessages.includes(index) ? "selected" : ""}`}
                    onMouseDown={() => handleMessagePress(msg, index)}
                    onMouseUp={handleMessageRelease}
                    onMouseLeave={handleMessageRelease}
                    onTouchStart={() => handleMessagePress(msg, index)}
                    onTouchEnd={handleMessageRelease}
                    onClick={() => toggleMessageSelection(index)}
                  >
                    <div className="message-content">
                      {renderMessageContent(msg)}
                    </div>
                    <div>
                      <img src={msg.sId === userData.id ? userData.avatar : chatUser.userData.avatar} alt="" />
                      <p>{convertTimestamp(msg.createdAt)}</p>
                    </div>
                  </div>
                )
              })
            }
          </div>
          <div className="chat-input">
            <div className="emoji-picker-container" ref={emojiPickerRef}>
              <button 
                className="emoji-button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              >
                😊
              </button>
              {showEmojiPicker && (
                <div className="emoji-picker-wrapper">
                  <EmojiPicker
                    onEmojiClick={onEmojiClick}
                    width={300}
                    height={400}
                  />
                </div>
              )}
            </div>
            <input onKeyDown={(e) => e.key === "Enter" ? sendMessage() : null} onChange={(e) => setInput(e.target.value)} value={input} type="text" placeholder='Send a message' />
            <input onChange={sendImage} type="file" id='image' accept="image/png, image/jpeg" hidden />
            <label htmlFor="image">
              <img src={assets.gallery_icon} alt="" />
            </label>
            <img onClick={sendMessage} src={assets.send_button} alt="" />
          </div>
        </div>
      ) : (
        <div className={`chat-welcome ${chatVisible ? "" : "hidden"}`}>
          <img src={assets.logo_icon} alt=''/>
          <p>Chat anytime, anywhere</p>
        </div>
      )}
    </>
  )
}

export default ChatBox
