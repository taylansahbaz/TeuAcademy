import { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";
import { Calendar as CalendarIcon, Clock, Users, ArrowRight } from "lucide-react";
import clsx from "clsx";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { useSearchParams } from "react-router-dom";
import WorkshopModal from "../components/WorkshopModal";

export default function WorkshopsView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const workshopIdParam = searchParams.get("workshopId");

  const [workshops, setWorkshops] = useState([]);
  const [selectedWorkshop, setSelectedWorkshop] = useState(null);

  useEffect(() => {
    if (workshopIdParam && workshops.length > 0) {
      const w = workshops.find(x => x.id === workshopIdParam);
      if (w) setSelectedWorkshop(w);
    }
  }, [workshopIdParam, workshops]);

  const handleCloseModal = () => {
    setSelectedWorkshop(null);
    if (workshopIdParam) {
      searchParams.delete("workshopId");
      setSearchParams(searchParams);
    }
  };

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "workshops"), (snapshot) => {
      const workshopsData = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(w => !w.isDeleted)
        .sort((a, b) => {
          const dateA = a.date ? new Date(a.date) : new Date(0);
          const dateB = b.date ? new Date(b.date) : new Date(0);
          return dateA - dateB;
        });
      setWorkshops(workshopsData);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="animate-fade-in space-y-8 relative pb-20">

      {/* Modal Overlay */}
      <WorkshopModal
        isOpen={!!selectedWorkshop}
        onClose={handleCloseModal}
        workshop={selectedWorkshop}
      />

      {/* Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {workshops.length === 0 ? (
          <div className="col-span-full border border-slate-200 rounded-2xl bg-white p-16 text-center shadow-sm">
            <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CalendarIcon className="w-5 h-5 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Planlanmış Eğitim Yok</h3>
            <p className="text-slate-500 mt-1 text-sm font-medium">Henüz aktif bir eğitim bulunmuyor.</p>
          </div>
        ) : (
          workshops.map((workshop) => {
            const category = workshop.category || "Genel";
            const capacity = parseInt(workshop.capacity || workshop.maxCapacity || "0");
            const attendeesCount = workshop.attendees?.length || 0;
            const progressPercent = capacity > 0 ? Math.min((attendeesCount / capacity) * 100, 100) : 0;

            return (
              <div
                key={workshop.id}
                onClick={() => {
                  setSelectedWorkshop(workshop);
                  setSearchParams({ workshopId: workshop.id });
                }}
                className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 flex flex-col cursor-pointer border border-slate-200 hover:border-slate-300 group overflow-hidden"
              >
                <div className="p-6 flex flex-col h-full relative">

                  {/* Header: Date & Category */}
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                        {workshop.date ? format(parseISO(workshop.date), 'MMMM', { locale: tr }) : "Bilinmiyor"}
                      </span>
                      <span className="text-2xl font-black text-slate-900 leading-none tracking-tight">
                        {workshop.date ? format(parseISO(workshop.date), 'dd') : "-"}
                      </span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div className="mb-6 flex-1">
                    <h3 className="text-lg font-bold text-slate-900 leading-snug mb-2 group-hover:text-indigo-600 transition-colors line-clamp-2">
                      {workshop.title}
                    </h3>
                  </div>

                  {/* Time */}
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-6 border-l-2 border-slate-200 pl-3">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{workshop.time}{workshop.endTime ? ` - ${workshop.endTime}` : ''}</span>
                  </div>

                  {/* Progress & Attendees */}
                  <div className="mt-auto pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {attendeesCount} <span className="text-slate-400 font-medium">/ {capacity}</span>
                      </div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        Detay <ArrowRight className="w-3 h-3" />
                      </div>
                    </div>

                    <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-slate-900 rounded-full transition-all duration-700"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
