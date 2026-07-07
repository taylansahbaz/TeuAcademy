import { useState, useEffect, useRef } from "react";
import { Bell, BookOpen, User, Calendar as CalendarIcon, Users, Check } from "lucide-react";
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../contexts/AuthContext";
import { formatDistanceToNow, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import clsx from "clsx";

export default function NotificationDropdown() {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!currentUser) return;

    // Fetch user-specific and global notifications
    const q = query(
      collection(db, "notifications"),
      where("userId", "in", [currentUser.uid, "global"]),
      // We do client side sorting because firebase requires composite index for 'in' + 'orderBy'
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort descending by date
      notifs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setNotifications(notifs);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isNotificationRead = (notif) => {
    if (notif.userId === "global") {
      return notif.readBy?.includes(currentUser.uid);
    }
    return notif.isRead;
  };

  const unreadCount = notifications.filter(n => !isNotificationRead(n)).length;

  const handleMarkAsRead = async (notif) => {
    if (isNotificationRead(notif)) return;
    
    try {
      if (notif.userId === "global") {
        const { arrayUnion } = await import("firebase/firestore");
        await updateDoc(doc(db, "notifications", notif.id), {
          readBy: arrayUnion(currentUser.uid)
        });
      } else {
        await updateDoc(doc(db, "notifications", notif.id), {
          isRead: true
        });
      }
    } catch (error) {
      console.error("Bildirim güncellenirken hata:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadNotifs = notifications.filter(n => !isNotificationRead(n));
    for (const notif of unreadNotifs) {
      await handleMarkAsRead(notif);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case "new_workshop": return <BookOpen className="w-5 h-5 text-blue-500" />;
      case "new_staff": return <User className="w-5 h-5 text-emerald-500" />;
      case "workshop_reminder": return <CalendarIcon className="w-5 h-5 text-orange-500" />;
      case "new_attendee": return <Users className="w-5 h-5 text-indigo-500" />;
      default: return <Bell className="w-5 h-5 text-slate-500" />;
    }
  };

  const getBgColor = (type) => {
    switch (type) {
      case "new_workshop": return "bg-blue-50";
      case "new_staff": return "bg-emerald-50";
      case "workshop_reminder": return "bg-orange-50";
      case "new_attendee": return "bg-indigo-50";
      default: return "bg-slate-50";
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-full transition-colors focus:outline-none"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex w-3.5 h-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full w-3.5 h-3.5 bg-red-500 border-2 border-white"></span>
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-scale-in origin-top-right">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-bold text-slate-900">Bildirimler</h3>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllAsRead}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" /> Tümü Okundu
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto hide-scrollbar">
            {notifications.length === 0 ? (
              <div className="px-5 py-10 text-center flex flex-col items-center justify-center text-slate-500">
                <Bell className="w-8 h-8 text-slate-300 mb-3" />
                <p className="font-medium text-sm">Henüz bildiriminiz yok.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {notifications.map((notif) => {
                  const readStatus = isNotificationRead(notif);
                  return (
                  <div 
                    key={notif.id} 
                    onClick={() => handleMarkAsRead(notif)}
                    className={clsx(
                      "p-5 flex gap-4 transition-colors cursor-pointer hover:bg-slate-50",
                      !readStatus ? "bg-indigo-50/30" : "opacity-75"
                    )}
                  >
                    <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center shrink-0", getBgColor(notif.type))}>
                      {getIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={clsx("text-sm font-bold truncate", !readStatus ? "text-slate-900" : "text-slate-700")}>
                        {notif.title}
                      </h4>
                      <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">
                        {notif.message}
                      </p>
                      <span className="text-[11px] font-bold text-slate-400 mt-2 block uppercase tracking-wider">
                        {formatDistanceToNow(parseISO(notif.createdAt), { addSuffix: true, locale: tr })}
                      </span>
                    </div>
                    {!readStatus && (
                      <div className="w-2 h-2 rounded-full bg-indigo-600 mt-1.5 shrink-0"></div>
                    )}
                  </div>
                )})}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
