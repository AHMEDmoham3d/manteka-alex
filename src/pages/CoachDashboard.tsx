import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Player, Coach } from '../lib/supabase';
import type { ExamPeriod } from '../lib/supabase';
import { LogOut, Search, UserCircle, CheckCircle, XCircle, Download, Trophy } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function CoachDashboard() {
  const { signOut, user } = useAuth();
  const [coach, setCoach] = useState<Coach | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [registeredPlayers, setRegisteredPlayers] = useState<any[]>([]);
  const [tournamentRegisteredPlayers, setTournamentRegisteredPlayers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeExam, setActiveExam] = useState<ExamPeriod | null>(null);
  const [activeTournament, setActiveTournament] = useState<any | null>(null);

  const registerPlayer = async (player: Player) => {
    if (!activeExam || !user) return;

    try {
      const { error, data } = await supabase
        .from('exam_registrations')
        .insert({
          exam_period_id: activeExam.id,
          player_id: player.id,
          coach_id: user.id,
          player_name: player.full_name,
          birth_date: player.birth_date || null,
          last_belt: player.belt || null,
        })
        .select('*')
        .single();

      if (error) throw error;

      alert('تم تسجيل اللاعب في الاختبار بنجاح!');
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === player.id ? { ...p, registered: true } : p
        )
      );
      
      if (data) {
        setRegisteredPlayers(prev => [...prev, data]);
      }
    } catch (error) {
      console.error('Error registering player:', error);
      alert('حدث خطأ أثناء التسجيل في الاختبار');
    }
  };

  const unregisterPlayer = async (player: Player) => {
    if (!activeExam || !user) return;

    try {
      const { error } = await supabase
        .from('exam_registrations')
        .delete()
        .match({
          exam_period_id: activeExam.id,
          player_id: player.id,
          coach_id: user.id,
        });

      if (error) throw error;

      alert('تم إلغاء تسجيل اللاعب من الاختبار بنجاح!');
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === player.id ? { ...p, registered: false } : p
        )
      );
      
      setRegisteredPlayers(prev => prev.filter(r => r.player_id !== player.id));
    } catch (error) {
      console.error('Error unregistering player:', error);
      alert('حدث خطأ أثناء إلغاء التسجيل من الاختبار');
    }
  };

  const registerPlayerTournament = async (player: Player) => {
    if (!activeTournament || !user) return;

    try {
      const { error, data } = await supabase
        .from('tournament_registrations')
        .insert({
          tournament_period_id: activeTournament.id,
          player_id: player.id,
          coach_id: user.id,
          player_name: player.full_name,
          birth_date: player.birth_date || null,
          last_belt: player.belt || null,
        })
        .select('*')
        .single();

      if (error) throw error;

      alert('تم تسجيل اللاعب في البطولة بنجاح!');
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === player.id ? { ...p, tournamentRegistered: true } : p
        )
      );
      
      if (data) {
        setTournamentRegisteredPlayers(prev => [...prev, data]);
      }
    } catch (error) {
      console.error('Error registering player for tournament:', error);
      alert('حدث خطأ أثناء التسجيل في البطولة');
    }
  };

  const unregisterPlayerTournament = async (player: Player) => {
    if (!activeTournament || !user) return;

    try {
      const { error } = await supabase
        .from('tournament_registrations')
        .delete()
        .match({
          tournament_period_id: activeTournament.id,
          player_id: player.id,
          coach_id: user.id,
        });

      if (error) throw error;

      alert('تم إلغاء تسجيل اللاعب من البطولة بنجاح!');
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === player.id ? { ...p, tournamentRegistered: false } : p
        )
      );
      
      setTournamentRegisteredPlayers(prev => prev.filter(r => r.player_id !== player.id));
    } catch (error) {
      console.error('Error unregistering player from tournament:', error);
      alert('حدث خطأ أثناء إلغاء التسجيل من البطولة');
    }
  };

  const downloadRegisteredPlayers = () => {
    if (registeredPlayers.length === 0) {
      alert('لا يوجد لاعبين مسجلين في الاختبار للتحميل');
      return;
    }

    // تحضير البيانات للتصدير
    const exportData = registeredPlayers.map((player, index) => {
      const playerData = players.find(p => p.id === player.player_id);
      return {
        'م': index + 1,
        'اسم اللاعب': player.player_name,
        'الحزام الأخير': getBeltName(player.last_belt || 'white'),
        'تاريخ الميلاد': player.birth_date ? formatDate(player.birth_date) : 'غير محدد',
        'رقم الملف': playerData?.file_number || 'غير محدد',
        'تاريخ التسجيل': formatDate(player.created_at),
        'رقم تسجيل اللاعب': player.player_id,
        'رقم تسجيل المدرب': player.coach_id || user?.id,
        'فترة الاختبار': activeExam ? `${activeExam.start_date} إلى ${activeExam.end_date}` : 'غير محدد'
      };
    });

    // إضافة معلومات إضافية
    const summary = [
      {},
      {
        'م': 'ملخص',
        'اسم اللاعب': `إجمالي عدد اللاعبين: ${registeredPlayers.length}`,
        'الحزام الأخير': `اسم المدرب: ${coach?.full_name || 'غير محدد'}`,
        'تاريخ الميلاد': `المؤسسة: ${coach?.organization?.name || 'غير محدد'}`,
        'رقم الملف': `تاريخ التحميل: ${new Date().toLocaleDateString('ar-EG')}`,
        'تاريخ التسجيل': `وقت التحميل: ${new Date().toLocaleTimeString('ar-EG')}`,
        'رقم تسجيل اللاعب': '',
        'رقم تسجيل المدرب': '',
        'فترة الاختبار': ''
      },
      {}
    ];

    const finalData = [...exportData, ...summary];

    // إنشاء ورقة عمل
    const ws = XLSX.utils.json_to_sheet(finalData, { skipHeader: false });
    
    // ضبط عرض الأعمدة
    const wscols = [
      { wch: 5 },  // م
      { wch: 25 }, // اسم اللاعب
      { wch: 15 }, // الحزام الأخير
      { wch: 15 }, // تاريخ الميلاد
      { wch: 15 }, // رقم الملف
      { wch: 15 }, // تاريخ التسجيل
      { wch: 20 }, // رقم تسجيل اللاعب
      { wch: 20 }, // رقم تسجيل المدرب
      { wch: 30 }  // فترة الاختبار
    ];
    ws['!cols'] = wscols;

    // إنشاء مصنف وإضافة الورقة
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'اللاعبين المسجلين في الاختبار');

    // توليد اسم الملف
    const fileName = `لاعبين_مسجلين_اختبار_${coach?.full_name || 'مدرب'}_${new Date().toISOString().split('T')[0]}.xlsx`;

    // تحميل الملف
    XLSX.writeFile(wb, fileName);
    
    alert(`تم تحميل ملف ${fileName} بنجاح`);
  };

  const downloadTournamentRegisteredPlayers = () => {
    if (tournamentRegisteredPlayers.length === 0) {
      alert('لا يوجد لاعبين مسجلين في البطولة للتحميل');
      return;
    }

    // تحضير البيانات للتصدير
    const exportData = tournamentRegisteredPlayers.map((player, index) => {
      const playerData = players.find(p => p.id === player.player_id);
      return {
        'م': index + 1,
        'اسم اللاعب': player.player_name,
        'الحزام الأخير': getBeltName(player.last_belt || 'white'),
        'تاريخ الميلاد': player.birth_date ? formatDate(player.birth_date) : 'غير محدد',
        'رقم الملف': playerData?.file_number || 'غير محدد',
        'تاريخ التسجيل': formatDate(player.created_at),
        'رقم تسجيل اللاعب': player.player_id,
        'رقم تسجيل المدرب': player.coach_id || user?.id,
        'فترة البطولة': activeTournament ? `${activeTournament.start_date} إلى ${activeTournament.end_date}` : 'غير محدد'
      };
    });

    // إضافة معلومات إضافية
    const summary = [
      {},
      {
        'م': 'ملخص',
        'اسم اللاعب': `إجمالي عدد اللاعبين: ${tournamentRegisteredPlayers.length}`,
        'الحزام الأخير': `اسم المدرب: ${coach?.full_name || 'غير محدد'}`,
        'تاريخ الميلاد': `المؤسسة: ${coach?.organization?.name || 'غير محدد'}`,
        'رقم الملف': `تاريخ التحميل: ${new Date().toLocaleDateString('ar-EG')}`,
        'تاريخ التسجيل': `وقت التحميل: ${new Date().toLocaleTimeString('ar-EG')}`,
        'رقم تسجيل اللاعب': '',
        'رقم تسجيل المدرب': '',
        'فترة البطولة': ''
      },
      {}
    ];

    const finalData = [...exportData, ...summary];

    // إنشاء ورقة عمل
    const ws = XLSX.utils.json_to_sheet(finalData, { skipHeader: false });
    
    // ضبط عرض الأعمدة
    const wscols = [
      { wch: 5 },  // م
      { wch: 25 }, // اسم اللاعب
      { wch: 15 }, // الحزام الأخير
      { wch: 15 }, // تاريخ الميلاد
      { wch: 15 }, // رقم الملف
      { wch: 15 }, // تاريخ التسجيل
      { wch: 20 }, // رقم تسجيل اللاعب
      { wch: 20 }, // رقم تسجيل المدرب
      { wch: 30 }  // فترة البطولة
    ];
    ws['!cols'] = wscols;

    // إنشاء مصنف وإضافة الورقة
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'اللاعبين المسجلين في البطولة');

    // توليد اسم الملف
    const fileName = `لاعبين_مسجلين_بطولة_${coach?.full_name || 'مدرب'}_${new Date().toISOString().split('T')[0]}.xlsx`;

    // تحميل الملف
    XLSX.writeFile(wb, fileName);
    
    alert(`تم تحميل ملف ${fileName} بنجاح`);
  };

  useEffect(() => {
    const loadCoachData = async () => {
      if (!user) return;

      setLoading(true);
      try {
        const { data: coachData } = await supabase
          .from('profiles')
          .select('*, organization:organizations(*)')
          .eq('id', user.id)
          .maybeSingle();

        setCoach(coachData || null);

        const { data: playersData } = await supabase
          .from('players')
          .select('*')
          .eq('coach_id', user.id)
          .order('full_name');

        const playersList = playersData || [];

        // التحقق من وجود فترة اختبار نشطة
        const today = new Date().toISOString().split('T')[0];
        const { data: activeExamData } = await supabase
          .from('exam_periods')
          .select('*')
          .lte('start_date', today)
          .gte('end_date', today)
          .maybeSingle();

        setActiveExam(activeExamData);

        // جلب البطولة النشطة
        const { data: activeTournamentData } = await supabase
          .from('tournament_periods')
          .select('*')
          .lte('start_date', today)
          .gte('end_date', today)
          .maybeSingle();

        setActiveTournament(activeTournamentData);

        // جلب تسجيلات الاختبارات الحالية للمدرب
        if (activeExamData) {
          const { data: registrations } = await supabase
            .from('exam_registrations')
            .select(`
              id,
              player_id,
              player_name,
              birth_date,
              last_belt,
              created_at,
              coach_id
            `)
            .eq('coach_id', user.id)
            .eq('exam_period_id', activeExamData.id);

          setRegisteredPlayers(registrations || []);

          const registeredIds = registrations?.map(r => r.player_id) || [];

          // تحديث حالة تسجيل الاختبار للاعبين
          playersList.forEach(player => {
            player.registered = registeredIds.includes(player.id);
          });
        }

        // جلب تسجيلات البطولات الحالية للمدرب
        if (activeTournamentData) {
          const { data: tournamentRegs } = await supabase
            .from('tournament_registrations')
            .select('*')
            .eq('coach_id', user.id)
            .eq('tournament_period_id', activeTournamentData.id);

          setTournamentRegisteredPlayers(tournamentRegs || []);

          const tournamentRegisteredIds = tournamentRegs?.map(r => r.player_id) || [];

          // تحديث حالة تسجيل البطولة للاعبين
          playersList.forEach(player => {
            player.tournamentRegistered = tournamentRegisteredIds.includes(player.id);
          });
        }

        setPlayers(playersList);
        setFilteredPlayers(playersList);
      } catch (error) {
        console.error('Error loading coach data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCoachData();
  }, [user]);

  useEffect(() => {
    filterPlayers();
  }, [searchTerm, players]);

  const filterPlayers = () => {
    if (!searchTerm.trim()) {
      setFilteredPlayers(players);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = players.filter(
      (player) =>
        player.full_name.toLowerCase().includes(term) ||
        player.belt?.toLowerCase().includes(term)
    );
    setFilteredPlayers(filtered);
  };

  const getBeltColor = (belt: string) => {
    const colors: Record<string, string> = {
      white: 'bg-gray-200 text-gray-800',
      yellow: 'bg-yellow-200 text-yellow-800',
      orange: 'bg-orange-200 text-orange-800',
      green: 'bg-green-200 text-green-800',
      blue: 'bg-blue-200 text-blue-800',
      brown: 'bg-amber-700 text-white',
      black: 'bg-gray-900 text-white',
    };
    return colors[belt] || 'bg-gray-200 text-gray-800';
  };

  const getBeltName = (belt: string) => {
    const names: Record<string, string> = {
      white: 'أبيض',
      yellow: 'أصفر',
      orange: 'برتقالي',
      green: 'أخضر',
      blue: 'أزرق',
      brown: 'بني',
      black: 'أسود',
    };
    return names[belt] || belt;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'غير محدد';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG');
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                لوحة تحكم المدرب
              </h1>
              {coach && (
                <div className="mt-1 space-y-1">
                  <p className="text-sm text-gray-600">
                    المدرب: <span className="font-medium text-gray-900">{coach.full_name}</span>
                  </p>
                  <p className="text-sm text-gray-600">
                    المؤسسة: <span className="font-medium text-gray-900">{coach.organization?.name}</span>
                  </p>
                </div>
              )}
            </div>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* قسم اللاعبين المسجلين في الاختبار */}
        {activeExam && registeredPlayers.length > 0 && (
          <div className="mb-6 bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-green-800 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                اللاعبين المسجلين في الاختبار الحالي
              </h3>
              <div className="flex items-center gap-4">
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                  {registeredPlayers.length} لاعب
                </span>
                <button
                  onClick={downloadRegisteredPlayers}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                >
                  <Download className="w-4 h-4" />
                  تحميل قائمة اللاعبين
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="py-3 px-4 text-right text-sm font-medium text-gray-700">اسم اللاعب</th>
                    <th className="py-3 px-4 text-right text-sm font-medium text-gray-700">الحزام الأخير</th>
                    <th className="py-3 px-4 text-right text-sm font-medium text-gray-700">تاريخ الميلاد</th>
                    <th className="py-3 px-4 text-right text-sm font-medium text-gray-700">تاريخ التسجيل</th>
                    <th className="py-3 px-4 text-right text-sm font-medium text-gray-700">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {registeredPlayers.map((reg) => (
                    <tr key={reg.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <UserCircle className="w-5 h-5 text-blue-600" />
                          </div>
                          <span className="font-medium text-gray-900">{reg.player_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getBeltColor(reg.last_belt || 'white')}`}>
                          {getBeltName(reg.last_belt || 'white')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {reg.birth_date ? formatDate(reg.birth_date) : 'غير محدد'}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {formatDate(reg.created_at)}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => {
                            const player = players.find(p => p.id === reg.player_id);
                            if (player) unregisterPlayer(player);
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-sm rounded-lg transition"
                        >
                          <XCircle className="w-4 h-4" />
                          إلغاء التسجيل
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* قسم اللاعبين المسجلين في البطولة */}
        {activeTournament && tournamentRegisteredPlayers.length > 0 && (
          <div className="mb-6 bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-purple-800 flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                اللاعبين المسجلين في البطولة الحالية
              </h3>
              <div className="flex items-center gap-4">
                <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                  {tournamentRegisteredPlayers.length} لاعب
                </span>
                <button
                  onClick={downloadTournamentRegisteredPlayers}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
                >
                  <Download className="w-4 h-4" />
                  تحميل قائمة اللاعبين
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="py-3 px-4 text-right text-sm font-medium text-gray-700">اسم اللاعب</th>
                    <th className="py-3 px-4 text-right text-sm font-medium text-gray-700">الحزام الأخير</th>
                    <th className="py-3 px-4 text-right text-sm font-medium text-gray-700">تاريخ الميلاد</th>
                    <th className="py-3 px-4 text-right text-sm font-medium text-gray-700">تاريخ التسجيل</th>
                    <th className="py-3 px-4 text-right text-sm font-medium text-gray-700">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {tournamentRegisteredPlayers.map((reg) => (
                    <tr key={reg.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <UserCircle className="w-5 h-5 text-purple-600" />
                          </div>
                          <span className="font-medium text-gray-900">{reg.player_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getBeltColor(reg.last_belt || 'white')}`}>
                          {getBeltName(reg.last_belt || 'white')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {reg.birth_date ? formatDate(reg.birth_date) : 'غير محدد'}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {formatDate(reg.created_at)}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => {
                            const player = players.find(p => p.id === reg.player_id);
                            if (player) unregisterPlayerTournament(player);
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-sm rounded-lg transition"
                        >
                          <XCircle className="w-4 h-4" />
                          إلغاء التسجيل
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* قسم جميع اللاعبين */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">جميع اللاعبين</h2>
                <p className="text-sm text-gray-600 mt-1">
                  عدد اللاعبين: {filteredPlayers.length}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                {activeExam && (
                  <div className="bg-blue-50 px-4 py-2 rounded-lg">
                    <p className="text-blue-700 font-medium">فترة اختبار نشطة</p>
                    <p className="text-sm text-blue-600">
                      {activeExam.start_date} إلى {activeExam.end_date}
                    </p>
                  </div>
                )}
                {activeTournament && (
                  <div className="bg-purple-50 px-4 py-2 rounded-lg">
                    <p className="text-purple-700 font-medium">بطولة نشطة</p>
                    <p className="text-sm text-purple-600">
                      {activeTournament.start_date} إلى {activeTournament.end_date}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="relative">
              <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="ابحث عن لاعب (الاسم، الحزام)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-12 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : filteredPlayers.length === 0 ? (
              <div className="text-center py-12">
                <UserCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">
                  {searchTerm ? 'لم يتم العثور على نتائج' : 'لا يوجد لاعبين'}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-blue-300 transition-all duration-200 transform hover:-translate-y-1"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center shadow-sm">
                          <UserCircle className="w-8 h-8 text-blue-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-gray-900 text-lg truncate">{player.full_name}</h3>
                          <p className="text-sm text-gray-600">
                            رقم الملف: {player.file_number || 'غير محدد'}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        {player.registered && (
                          <span className="flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium shadow-sm">
                            <CheckCircle className="w-3 h-3" />
                            مسجل اختبار
                          </span>
                        )}
                        {player.tournamentRegistered && (
                          <span className="flex items-center gap-1 bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium shadow-sm">
                            <Trophy className="w-3 h-3" />
                            مسجل بطولة
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">الحزام:</span>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${getBeltColor(
                            player.belt || 'white'
                          )} shadow-sm`}
                        >
                          {getBeltName(player.belt || 'white')}
                        </span>
                      </div>

                      {player.birth_date && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">تاريخ الميلاد:</span>
                          <span className="text-sm text-gray-900 font-medium">{formatDate(player.birth_date)}</span>
                        </div>
                      )}

                      {/* أزرار التسجيل */}
                      <div className="space-y-2 pt-2">
                        {/* زر تسجيل الاختبار */}
                        {activeExam && (
                          <div className="flex gap-2">
                            {!player.registered ? (
                              <button
                                onClick={() => registerPlayer(player)}
                                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                              >
                                تسجيل للاختبار
                              </button>
                            ) : (
                              <button
                                onClick={() => unregisterPlayer(player)}
                                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                              >
                                إلغاء التسجيل من الاختبار
                              </button>
                            )}
                          </div>
                        )}

                        {/* زر تسجيل البطولة */}
                        {activeTournament && (
                          <div className="flex gap-2">
                            {!player.tournamentRegistered ? (
                              <button
                                onClick={() => registerPlayerTournament(player)}
                                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                              >
                                تسجيل في البطولة
                              </button>
                            ) : (
                              <button
                                onClick={() => unregisterPlayerTournament(player)}
                                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                              >
                                إلغاء التسجيل من البطولة
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}