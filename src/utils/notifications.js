import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase/config";

/**
 * Bildirim fırlatmak için yardımcı fonksiyon.
 * @param {Object} data 
 * @param {string} data.userId - Hedef kullanıcının ID'si. Herkese gidecekse "global" kullanılır.
 * @param {string} data.title - Bildirim başlığı.
 * @param {string} data.message - Bildirim içeriği.
 * @param {string} data.type - İkon veya stil belirlemek için tür ("new_workshop", "new_staff", "workshop_reminder", "new_attendee")
 */
export const sendNotification = async ({ userId, title, message, type }) => {
  try {
    await addDoc(collection(db, "notifications"), {
      userId,
      title,
      message,
      type,
      isRead: false,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Bildirim gönderilirken hata oluştu:", error);
  }
};
