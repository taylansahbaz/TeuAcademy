import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import { Search, Loader2 } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import StaffDetailModal from "../components/StaffDetailModal";

export default function StaffDirectory() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPerson, setSelectedPerson] = useState(null);
  
  const [searchParams, setSearchParams] = useSearchParams();
  const staffIdParam = searchParams.get("staffId");

  useEffect(() => {
    if (staffIdParam && staff.length > 0) {
      const person = staff.find(x => x.id === staffIdParam);
      if (person) setSelectedPerson(person);
    }
  }, [staffIdParam, staff]);

  const handleCloseModal = () => {
    setSelectedPerson(null);
    if (staffIdParam) {
      searchParams.delete("staffId");
      setSearchParams(searchParams);
    }
  };

  useEffect(() => {
    async function fetchStaff() {
      try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const staffData = querySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(person => !person.isDeleted);
        setStaff(staffData);
      } catch (error) {
        console.error("Personel listesi alınamadı:", error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchStaff();
  }, []);

  const filteredStaff = staff.filter(person => 
    person.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    person.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    person.jobTags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
    person.hobbyTag?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-fade-in space-y-8 relative">
      <StaffDetailModal 
        isOpen={!!selectedPerson} 
        onClose={handleCloseModal} 
        person={selectedPerson} 
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Personel Dizini</h2>
          <p className="text-slate-500 text-sm mt-1">Ekip üyelerini tanıyın ve uzmanlık alanlarını keşfedin.</p>
        </div>
        
        <div className="relative w-full sm:w-80 shadow-sm rounded-lg">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="İsim, unvan veya yetenek ara..." 
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-600" />
          <p className="font-medium">Personel listesi yükleniyor...</p>
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center flex flex-col items-center justify-center shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-slate-400" />
          </div>
          <p className="font-bold text-slate-900 text-lg">Sonuç Bulunamadı</p>
          <p className="mt-1 text-sm text-slate-500">Arama kriterlerine uygun personel bulunamadı veya henüz kimse kayıt olmadı.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredStaff.map(person => (
            <div 
              key={person.id} 
              onClick={() => {
                setSelectedPerson(person);
                setSearchParams({ staffId: person.id });
              }}
              className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col hover:border-indigo-300 hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
            >
              <div className="flex items-center gap-4 mb-5">
                <div className="w-16 h-16 rounded-full bg-slate-100 border border-borderLight flex items-center justify-center text-xl text-primary font-bold overflow-hidden flex-shrink-0 shadow-sm">
                  {person.photoURL ? (
                    <img src={person.photoURL} alt={person.name} className="w-full h-full object-cover" />
                  ) : (
                    person.name?.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-textMain line-clamp-1">{person.name}</h3>
                  <p className="text-textMuted text-sm line-clamp-1 font-medium">{person.title}</p>
                </div>
              </div>

              <div className="flex-1 space-y-5">
                {/* Uzmanlıklar */}
                <div>
                  <p className="text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Uzmanlık & İlgi</p>
                  <div className="flex flex-wrap gap-1.5">
                    {person.jobTags?.map(tag => (
                      <span key={tag} className="px-2.5 py-1 text-xs rounded-md bg-blue-50 text-blue-700 border border-blue-200/50 font-medium">
                        {tag}
                      </span>
                    ))}
                    {person.hobbyTag && (
                      <span className="px-2.5 py-1 text-xs rounded-md bg-purple-50 text-purple-700 border border-purple-200/50 font-medium">
                        {person.hobbyTag}
                      </span>
                    )}
                  </div>
                </div>

                {/* Uygun Günler */}
                {person.availableDays?.length > 0 && (
                  <div className="pt-4 border-t border-borderLight/60">
                    <p className="text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Uygun Günler</p>
                    <div className="flex flex-wrap gap-1.5">
                      {person.availableDays.map(day => (
                        <span key={day} className="px-2 py-0.5 text-[11px] rounded bg-green-50 text-green-700 font-medium border border-green-200/50">
                          {day.substring(0, 3)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
