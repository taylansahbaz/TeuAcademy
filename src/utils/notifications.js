import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase/config";

/**
 * Bildirim fırlatmak için yardımcı fonksiyon.
 * @param {Object} data 
 * @param {string} data.userId - Hedef kullanıcının ID'si. Herkese gidecekse "global" kullanılır.
 * @param {string} data.title - Bildirim başlığı.
 * @param {string} data.message - Bildirim içeriği.
 * @param {string} data.type - İkon veya stil belirlemek için tür ("new_workshop", "new_staff", "workshop_reminder", "new_attendee")
 * @param {string} [data.referenceId] - İlgili kayıt ID'si (workshopId, staffId vb.)
 */
export const sendNotification = async ({ userId, title, message, type, referenceId }) => {
  try {
    const payload = {
      userId,
      title,
      message,
      type,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    if (referenceId) {
      payload.referenceId = referenceId;
    }
    
    await addDoc(collection(db, "notifications"), payload);
  } catch (error) {
    console.error("Bildirim gönderilirken hata oluştu:", error);
  }
};
