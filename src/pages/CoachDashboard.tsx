import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Player, Coach } from '../lib/supabase';
import type { ExamPeriod, SecondaryRegistrationPeriod } from '../lib/supabase';
import { LogOut, Search, UserCircle, CheckCircle, XCircle, Download, BookOpen, Users } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType } from 'docx';

export default function CoachDashboard() {
  const { signOut, user } = useAuth();
  const [coach, setCoach] = useState<Coach | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [registeredPlayers, setRegisteredPlayers] = useState<any[]>([]);
  const [secondaryRegisteredPlayers, setSecondaryRegisteredPlayers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeExam, setActiveExam] = useState<ExamPeriod | null>(null);
  const [activeSecondaryRegistration, setActiveSecondaryRegistration] = useState<SecondaryRegistrationPeriod | null>(null);

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

  const registerPlayerSecondary = async (player: Player) => {
    if (!activeSecondaryRegistration || !user) return;

    try {
      const { error, data } = await supabase
        .from('secondary_registrations')
        .insert({
          secondary_period_id: activeSecondaryRegistration.id,
          player_id: player.id,
          coach_id: user.id,
          player_name: player.full_name,
          birth_date: player.birth_date || null,
          last_belt: player.belt || null,
        })
        .select('*')
        .single();

      if (error) throw error;

      alert('تم تسجيل اللاعب في التسجيل الثانوي بنجاح!');
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === player.id ? { ...p, secondaryRegistered: true } : p
        )
      );
      
      if (data) {
        setSecondaryRegisteredPlayers(prev => [...prev, data]);
      }
    } catch (error) {
      console.error('Error registering player for secondary registration:', error);
      alert('حدث خطأ أثناء التسجيل في التسجيل الثانوي');
    }
  };

  const unregisterPlayerSecondary = async (player: Player) => {
    if (!activeSecondaryRegistration || !user) return;

    try {
      const { error } = await supabase
        .from('secondary_registrations')
        .delete()
        .match({
          secondary_period_id: activeSecondaryRegistration.id,
          player_id: player.id,
          coach_id: user.id,
        });

      if (error) throw error;

      alert('تم إلغاء تسجيل اللاعب من التسجيل الثانوي بنجاح!');
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === player.id ? { ...p, secondaryRegistered: false } : p
        )
      );
      
      setSecondaryRegisteredPlayers(prev => prev.filter(r => r.player_id !== player.id));
    } catch (error) {
      console.error('Error unregistering player from secondary registration:', error);
      alert('حدث خطأ أثناء إلغاء التسجيل من التسجيل الثانوي');
    }
  };

  const downloadRegisteredPlayers = async () => {
    if (registeredPlayers.length === 0) {
      alert('لا يوجد لاعبين مسجلين في الاختبار للتحميل');
      return;
    }

    try {
      // جلب بيانات إضافية للاعبين
      const playersWithDetails = await Promise.all(
        registeredPlayers.map(async (reg) => {
          const playerData = players.find(p => p.id === reg.player_id);
          
          // جلب تاريخ الحصول على الحزام الحالي (مثال - يمكن تعديله حسب قاعدة البيانات)
          let beltObtainedDate = 'غير محدد';
          try {
            const { data: beltData } = await supabase
              .from('player_belt_history')
              .select('obtained_date')
              .eq('player_id', reg.player_id)
              .eq('belt', reg.last_belt || playerData?.belt)
              .order('obtained_date', { ascending: false })
              .limit(1)
              .maybeSingle();
            
            if (beltData?.obtained_date) {
              beltObtainedDate = formatDate(beltData.obtained_date);
            }
          } catch (error) {
            console.error('Error fetching belt history:', error);
          }

          return {
            ...reg,
            playerDetails: playerData,
            beltObtainedDate,
            result: 'قيد المراجعة' // يمكن تعديله حسب النظام
          };
        })
      );

      // إنشاء جدول البيانات
      const tableRows = [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph("رقم الملف")], width: { size: 15, type: WidthType.PERCENTAGE } }),
            new TableCell({ children: [new Paragraph("الإســـــــــــم")], width: { size: 25, type: WidthType.PERCENTAGE } }),
            new TableCell({ children: [new Paragraph("الميلاد")], width: { size: 15, type: WidthType.PERCENTAGE } }),
            new TableCell({ children: [new Paragraph("الحزام الحالي")], width: { size: 15, type: WidthType.PERCENTAGE } }),
            new TableCell({ children: [new Paragraph("تاريخ الحصول عليه")], width: { size: 15, type: WidthType.PERCENTAGE } }),
            new TableCell({ children: [new Paragraph("النتيجة")], width: { size: 15, type: WidthType.PERCENTAGE } }),
          ],
        }),
        ...playersWithDetails.map((player) => 
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph(player.playerDetails?.file_number?.toString() || 'غير محدد')] }),
              new TableCell({ children: [new Paragraph(player.player_name)] }),
              new TableCell({ children: [new Paragraph(player.birth_date ? formatDate(player.birth_date) : 'غير محدد')] }),
              new TableCell({ children: [new Paragraph(getBeltName(player.last_belt || 'white'))] }),
              new TableCell({ children: [new Paragraph(player.beltObtainedDate)] }),
              new TableCell({ children: [new Paragraph(player.result)] }),
            ],
          })
        ),
      ];

      // إنشاء المستند
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              text: "قائمة اللاعبين المسجلين في الاختبار",
              heading: "Title",
              alignment: "right",
            }),
            new Paragraph({
              text: `اسم المدرب: ${coach?.full_name || 'غير محدد'}`,
              alignment: "right",
              spacing: { after: 200 },
            }),
            // new Paragraph({
            //   text: `المؤسسة: ${coach?.organization?.name || 'غير محدد'}`,
            //   alignment: "right",
            //   spacing: { after: 200 },
            // }),
            new Paragraph({
              text: `فترة الاختبار: ${activeExam ? `${activeExam.start_date} إلى ${activeExam.end_date}` : 'غير محدد'}`,
              alignment: "right",
              spacing: { after: 200 },
            }),
            new Paragraph({
              text: `عدد اللاعبين: ${registeredPlayers.length}`,
              alignment: "right",
              spacing: { after: 400 },
            }),
            new Table({
              rows: tableRows,
              width: { size: 100, type: WidthType.PERCENTAGE },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "ملاحظات:",
                  bold: true,
                }),
              ],
              alignment: "right",
              spacing: { before: 400 },
            }),
            new Paragraph({
              text: "▪ يرجى التأكد من صحة البيانات المدخلة",
              alignment: "right",
            }),
            new Paragraph({
              text: "▪ تم إنشاء هذا الملف تلقائياً من نظام إدارة الاختبارات",
              alignment: "right",
            }),
            new Paragraph({
              text: `▪ تاريخ التحميل: ${new Date().toLocaleDateString('ar-EG')}`,
              alignment: "right",
            }),
            new Paragraph({
              text: `▪ وقت التحميل: ${new Date().toLocaleTimeString('ar-EG')}`,
              alignment: "right",
              spacing: { after: 400 },
            }),
            new Paragraph({
              text: "التوقيع: _____________",
              alignment: "left",
            }),
          ],
        }],
      });

      // تحميل الملف
      const blob = await Packer.toBlob(doc);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `لاعبين_مسجلين_اختبار_${coach?.full_name || 'مدرب'}_${new Date().toISOString().split('T')[0]}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      alert(`تم تحميل ملف ${link.download} بنجاح`);
    } catch (error) {
      console.error('Error generating Word document:', error);
      alert('حدث خطأ أثناء إنشاء الملف');
    }
  };

  const downloadSecondaryRegisteredPlayers = async () => {
    if (secondaryRegisteredPlayers.length === 0) {
      alert('لا يوجد لاعبين مسجلين في التسجيل الثانوي للتحميل');
      return;
    }

    try {
      // جلب بيانات إضافية للاعبين
      const playersWithDetails = await Promise.all(
        secondaryRegisteredPlayers.map(async (reg) => {
          const playerData = players.find(p => p.id === reg.player_id);
          
          // جلب تاريخ الحصول على الحزام الحالي
          let beltObtainedDate = 'غير محدد';
          try {
            const { data: beltData } = await supabase
              .from('player_belt_history')
              .select('obtained_date')
              .eq('player_id', reg.player_id)
              .eq('belt', reg.last_belt || playerData?.belt)
              .order('obtained_date', { ascending: false })
              .limit(1)
              .maybeSingle();
            
            if (beltData?.obtained_date) {
              beltObtainedDate = formatDate(beltData.obtained_date);
            }
          } catch (error) {
            console.error('Error fetching belt history:', error);
          }

          return {
            ...reg,
            playerDetails: playerData,
            beltObtainedDate,
          };
        })
      );

      // إنشاء جدول البيانات
      const tableRows = [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph("رقم الملف")], width: { size: 15, type: WidthType.PERCENTAGE } }),
            new TableCell({ children: [new Paragraph("الإســـــــــــم")], width: { size: 25, type: WidthType.PERCENTAGE } }),
            new TableCell({ children: [new Paragraph("الميلاد")], width: { size: 15, type: WidthType.PERCENTAGE } }),
            new TableCell({ children: [new Paragraph("الحزام الحالي")], width: { size: 15, type: WidthType.PERCENTAGE } }),
            new TableCell({ children: [new Paragraph("تاريخ الحصول عليه")], width: { size: 15, type: WidthType.PERCENTAGE } }),
            new TableCell({ children: [new Paragraph("تاريخ التسجيل")], width: { size: 15, type: WidthType.PERCENTAGE } }),
          ],
        }),
        ...playersWithDetails.map((player) => 
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph(player.playerDetails?.file_number?.toString() || 'غير محدد')] }),
              new TableCell({ children: [new Paragraph(player.player_name)] }),
              new TableCell({ children: [new Paragraph(player.birth_date ? formatDate(player.birth_date) : 'غير محدد')] }),
              new TableCell({ children: [new Paragraph(getBeltName(player.last_belt || 'white'))] }),
              new TableCell({ children: [new Paragraph(player.beltObtainedDate)] }),
              new TableCell({ children: [new Paragraph(formatDate(player.created_at))] }),
            ],
          })
        ),
      ];

      // إنشاء المستند
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              text: "قائمة اللاعبين المسجلين في التسجيل الثانوي",
              heading: "Title",
              alignment: "right",
            }),
            new Paragraph({
              text: `اسم المدرب: ${coach?.full_name || 'غير محدد'}`,
              alignment: "right",
              spacing: { after: 200 },
            }),
            new Paragraph({
              text: `المؤسسة: ${coach?.organization?.name || 'غير محدد'}`,
              alignment: "right",
              spacing: { after: 200 },
            }),
            new Paragraph({
              text: `فترة التسجيل الثانوي: ${activeSecondaryRegistration ? `${activeSecondaryRegistration.start_date} إلى ${activeSecondaryRegistration.end_date}` : 'غير محدد'}`,
              alignment: "right",
              spacing: { after: 200 },
            }),
            new Paragraph({
              text: `عدد اللاعبين: ${secondaryRegisteredPlayers.length}`,
              alignment: "right",
              spacing: { after: 400 },
            }),
            new Table({
              rows: tableRows,
              width: { size: 100, type: WidthType.PERCENTAGE },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "ملاحظات:",
                  bold: true,
                }),
              ],
              alignment: "right",
              spacing: { before: 400 },
            }),
            new Paragraph({
              text: "▪ هذا الملف خاص بالتسجيل الثانوي للاعبين",
              alignment: "right",
            }),
            new Paragraph({
              text: "▪ تم إنشاء هذا الملف تلقائياً من نظام إدارة الاختبارات",
              alignment: "right",
            }),
            new Paragraph({
              text: `▪ تاريخ التحميل: ${new Date().toLocaleDateString('ar-EG')}`,
              alignment: "right",
            }),
            new Paragraph({
              text: `▪ وقت التحميل: ${new Date().toLocaleTimeString('ar-EG')}`,
              alignment: "right",
              spacing: { after: 400 },
            }),
            new Paragraph({
              text: "التوقيع: _____________",
              alignment: "left",
            }),
          ],
        }],
      });

      // تحميل الملف
      const blob = await Packer.toBlob(doc);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `لاعبين_مسجلين_ثانوي_${coach?.full_name || 'مدرب'}_${new Date().toISOString().split('T')[0]}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      alert(`تم تحميل ملف ${link.download} بنجاح`);
    } catch (error) {
      console.error('Error generating Word document:', error);
      alert('حدث خطأ أثناء إنشاء الملف');
    }
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

        // جلب فترة التسجيل الثانوي النشطة
        const { data: activeSecondaryData } = await supabase
          .from('secondary_registration_periods')
          .select('*')
          .lte('start_date', today)
          .gte('end_date', today)
          .maybeSingle();

        setActiveSecondaryRegistration(activeSecondaryData);

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

        // جلب تسجيلات التسجيل الثانوي الحالية للمدرب
        if (activeSecondaryData) {
          const { data: secondaryRegs } = await supabase
            .from('secondary_registrations')
            .select('*')
            .eq('coach_id', user.id)
            .eq('secondary_period_id', activeSecondaryData.id);

          setSecondaryRegisteredPlayers(secondaryRegs || []);

          const secondaryRegisteredIds = secondaryRegs?.map(r => r.player_id) || [];

          // تحديث حالة تسجيل التسجيل الثانوي للاعبين
          playersList.forEach(player => {
            player.secondaryRegistered = secondaryRegisteredIds.includes(player.id);
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
    <div className="min-h-screen bg-gray-50 animate-fade-in" dir="rtl">
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 border-b border-gray-200 shadow-lg animate-slide-down">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4 md:gap-6 min-w-0 flex-1 animate-slide-right">
              <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-white rounded-full flex items-center justify-center shadow-lg flex-shrink-0 animate-bounce-gentle">
                <UserCircle className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-blue-600" />
              </div>
              {coach && (
                <div className="min-w-0 flex-1 animate-fade-in-up">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white truncate">
                    أهلا بيك {coach.full_name}
                  </h1>
                </div>
              )}
            </div>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 sm:gap-3 px-3 py-2 sm:px-4 sm:py-2 md:px-6 md:py-3 bg-white hover:bg-gray-50 text-blue-600 rounded-lg transition-all duration-300 font-bold shadow-md hover:shadow-lg transform hover:-translate-y-0.5 hover:scale-105 text-sm sm:text-base flex-shrink-0 animate-slide-left"
            >
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">تسجيل الخروج</span>
              <span className="sm:hidden">خروج</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {/* قسم اللاعبين المسجلين في الاختبار */}
        {activeExam && registeredPlayers.length > 0 && (
          <div className="mb-8 sm:mb-10 md:mb-12 bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 md:p-8 animate-slide-in-up">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6 sm:mb-8 gap-4 sm:gap-6">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 truncate">
                    اللاعبين المسجلين في الاختبار الحالي
                  </h3>
                  <p className="text-gray-600 text-sm sm:text-base font-medium mt-1 truncate">
                    فترة الاختبار: {activeExam.start_date} إلى {activeExam.end_date}
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full lg:w-auto">
                <div className="bg-green-50 border border-green-200 px-4 py-2 sm:px-6 sm:py-3 rounded-lg">
                  <span className="text-green-800 text-sm sm:text-base md:text-lg font-semibold">
                    {registeredPlayers.length} لاعب مسجل
                  </span>
                </div>
                <button
                  onClick={downloadRegisteredPlayers}
                  className="flex items-center justify-center gap-2 sm:gap-3 px-4 py-2 sm:px-6 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 font-medium shadow-sm text-sm sm:text-base"
                >
                  <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">تحميل قائمة اللاعبين (Word)</span>
                  <span className="sm:hidden">تحميل Word</span>
                </button>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full bg-white border border-slate-300 rounded-2xl overflow-hidden shadow-lg">
                <thead className="bg-gradient-to-r from-slate-100 to-slate-200">
                  <tr>
                    <th className="py-4 px-6 text-right text-sm font-bold text-slate-700 border-b border-slate-300">اسم اللاعب</th>
                    <th className="py-4 px-6 text-right text-sm font-bold text-slate-700 border-b border-slate-300">الحزام الأخير</th>
                    <th className="py-4 px-6 text-right text-sm font-bold text-slate-700 border-b border-slate-300">تاريخ الميلاد</th>
                    <th className="py-4 px-6 text-right text-sm font-bold text-slate-700 border-b border-slate-300">تاريخ التسجيل</th>
                    <th className="py-4 px-6 text-right text-sm font-bold text-slate-700 border-b border-slate-300">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {registeredPlayers.map((reg) => (
                    <tr key={reg.id} className="hover:bg-gradient-to-r hover:from-slate-50 hover:to-blue-50 transition-all duration-200">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center shadow-md">
                            <UserCircle className="w-6 h-6 text-blue-600" />
                          </div>
                          <span className="font-semibold text-slate-800">{reg.player_name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-3 py-2 rounded-xl text-sm font-bold shadow-md border-2 ${getBeltColor(reg.last_belt || 'white')}`}>
                          {getBeltName(reg.last_belt || 'white')}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-600 font-medium">
                        {reg.birth_date ? formatDate(reg.birth_date) : 'غير محدد'}
                      </td>
                      <td className="py-4 px-6 text-slate-600 font-medium">
                        {formatDate(reg.created_at)}
                      </td>
                      <td className="py-4 px-6">
                        <button
                          onClick={() => {
                            const player = players.find(p => p.id === reg.player_id);
                            if (player) unregisterPlayer(player);
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-sm font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 hover:scale-105"
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

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {registeredPlayers.map((reg) => (
                <div key={reg.id} className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <UserCircle className="w-6 h-6 text-gray-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 text-lg">{reg.player_name}</h4>
                        <span className={`inline-block px-3 py-1 rounded text-sm font-medium mt-1 ${getBeltColor(reg.last_belt || 'white')}`}>
                          {getBeltName(reg.last_belt || 'white')}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const player = players.find(p => p.id === reg.player_id);
                        if (player) unregisterPlayer(player);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded transition-colors duration-200"
                    >
                      <XCircle className="w-4 h-4" />
                      إلغاء
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600 font-medium text-sm">تاريخ الميلاد:</span>
                      <span className="text-gray-900 font-medium text-sm">
                        {reg.birth_date ? formatDate(reg.birth_date) : 'غير محدد'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-600 font-medium text-sm">تاريخ التسجيل:</span>
                      <span className="text-gray-900 font-medium text-sm">
                        {formatDate(reg.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* قسم اللاعبين المسجلين في التسجيل الثانوي */}
        {activeSecondaryRegistration && secondaryRegisteredPlayers.length > 0 && (
          <div className="mb-6 sm:mb-8 md:mb-10 bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 animate-slide-in-up">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 truncate">
                  اللاعبين المسجلين في التسجيل الثانوي
                </h3>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <div className="bg-amber-50 border border-amber-200 px-3 py-2 sm:px-4 rounded-lg">
                  <span className="text-amber-800 text-sm sm:text-base font-semibold">
                    {secondaryRegisteredPlayers.length} لاعب مسجل
                  </span>
                </div>
                <button
                  onClick={downloadSecondaryRegisteredPlayers}
                  className="flex items-center justify-center gap-1 sm:gap-2 px-3 py-2 sm:px-4 bg-amber-600 hover:bg-amber-700 text-white rounded transition-colors duration-200 font-medium text-sm sm:text-base"
                >
                  <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">تحميل قائمة اللاعبين (Word)</span>
                  <span className="sm:hidden">تحميل Word</span>
                </button>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full bg-white border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3 px-4 text-right text-sm font-medium text-gray-700 border-b">اسم اللاعب</th>
                    <th className="py-3 px-4 text-right text-sm font-medium text-gray-700 border-b">الحزام الأخير</th>
                    <th className="py-3 px-4 text-right text-sm font-medium text-gray-700 border-b">تاريخ الميلاد</th>
                    <th className="py-3 px-4 text-right text-sm font-medium text-gray-700 border-b">تاريخ التسجيل</th>
                    <th className="py-3 px-4 text-right text-sm font-medium text-gray-700 border-b">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {secondaryRegisteredPlayers.map((reg) => (
                    <tr key={reg.id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                            <UserCircle className="w-5 h-5 text-gray-600" />
                          </div>
                          <span className="font-medium text-gray-900">{reg.player_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-sm font-medium ${getBeltColor(reg.last_belt || 'white')}`}>
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
                            if (player) unregisterPlayerSecondary(player);
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded transition-all duration-200"
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

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {secondaryRegisteredPlayers.map((reg) => (
                <div key={reg.id} className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <UserCircle className="w-6 h-6 text-gray-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 text-lg">{reg.player_name}</h4>
                        <span className={`inline-block px-3 py-1 rounded text-sm font-medium mt-1 ${getBeltColor(reg.last_belt || 'white')}`}>
                          {getBeltName(reg.last_belt || 'white')}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const player = players.find(p => p.id === reg.player_id);
                        if (player) unregisterPlayerSecondary(player);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded transition-colors duration-200"
                    >
                      <XCircle className="w-4 h-4" />
                      إلغاء
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600 font-medium text-sm">تاريخ الميلاد:</span>
                      <span className="text-gray-900 font-medium text-sm">
                        {reg.birth_date ? formatDate(reg.birth_date) : 'غير محدد'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-600 font-medium text-sm">تاريخ التسجيل:</span>
                      <span className="text-gray-900 font-medium text-sm">
                        {formatDate(reg.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* قسم جميع اللاعبين */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-slide-in-up">
          <div className="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 sm:gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3 sm:gap-4 mb-2">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg animate-bounce-gentle">
                    <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">جميع اللاعبين</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="bg-blue-100 border border-blue-200 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full shadow-sm">
                        <span className="text-blue-800 text-sm sm:text-base font-bold">{filteredPlayers.length}</span>
                        <span className="text-blue-700 text-xs sm:text-sm font-medium mr-1">لاعب</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full lg:w-auto">
                {activeExam && (
                  <div className="bg-blue-50 border border-blue-200 px-3 py-2 sm:px-4 sm:py-2 rounded-lg">
                    <p className="text-blue-900 font-semibold text-xs sm:text-sm">فترة اختبار نشطة</p>
                    <p className="text-blue-700 text-xs truncate">
                      {activeExam.start_date} إلى {activeExam.end_date}
                    </p>
                  </div>
                )}
                {activeSecondaryRegistration && (
                  <div className="bg-amber-50 border border-amber-200 px-3 py-2 sm:px-4 sm:py-2 rounded-lg">
                    <p className="text-amber-900 font-semibold text-xs sm:text-sm">فترة تسجيل ثانوي نشطة</p>
                    <p className="text-amber-700 text-xs truncate">
                      {activeSecondaryRegistration.start_date} إلى {activeSecondaryRegistration.end_date}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="relative mt-4 sm:mt-6 animate-slide-in-left">
              <div className="flex items-center bg-white border-2 border-gray-200 rounded-xl px-4 sm:px-6 focus-within:ring-4 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all duration-300 shadow-sm hover:shadow-md focus-within:shadow-lg animate-fade-in">
                <input
                  type="text"
                  placeholder="ابحث عن لاعب (الاسم، الحزام)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 pr-3 sm:pr-4 pl-0 py-3 sm:py-4 bg-transparent text-gray-900 placeholder-gray-500 text-base sm:text-lg outline-none"
                />
                <Search className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 animate-pulse flex-shrink-0" />
              </div>
            </div>
          </div>

          <div className="p-8">
            {loading ? (
              <div className="text-center py-20 animate-pulse">
                <div className="inline-block w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6 shadow-xl animate-bounce-gentle"></div>
                <p className="text-slate-700 text-xl font-bold animate-bounce">جاري التحميل...</p>
              </div>
            ) : filteredPlayers.length === 0 ? (
              <div className="text-center py-16 sm:py-20 animate-fade-in">
                <div className="w-24 h-24 sm:w-28 sm:h-28 bg-gradient-to-br from-slate-100 to-slate-200 rounded-3xl flex items-center justify-center mx-auto mb-6 sm:mb-8 shadow-2xl border-2 border-slate-300 animate-bounce-gentle">
                  <UserCircle className="w-12 h-12 sm:w-16 sm:h-16 text-slate-500" />
                </div>
                <p className="text-slate-800 text-xl sm:text-2xl font-bold mb-2">
                  {searchTerm ? 'لم يتم العثور على نتائج' : 'لا يوجد لاعبين'}
                </p>
                <p className="text-slate-600 text-sm sm:text-base font-medium">
                  {searchTerm ? 'جرب كلمات بحث مختلفة' : 'ابدأ بإضافة لاعبين جدد للمدرب'}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 animate-fade-in"
                  >
                    {/* Header with Avatar and Name */}
                    <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                        <UserCircle className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-gray-900 text-base sm:text-lg leading-tight truncate" title={player.full_name}>
                          {player.full_name}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600 font-medium truncate">
                          رقم الملف: {player.file_number || 'غير محدد'}
                        </p>
                      </div>
                    </div>

                    {/* Status Badges */}
                    <div className="flex flex-wrap gap-1 sm:gap-2 mb-3 sm:mb-4">
                      {player.belt && (
                        <span className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-xs sm:text-sm font-semibold shadow-sm ${getBeltColor(player.belt)}`}>
                          {getBeltName(player.belt)}
                        </span>
                      )}
                      {player.national_id && (
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-xs sm:text-sm font-semibold border border-blue-200">
                          الرقم القومي: {player.national_id}
                        </span>
                      )}
                      {player.registered && (
                        <span className="bg-green-100 text-green-800 px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-xs sm:text-sm font-semibold border border-green-200">
                          مسجل في الاختبار
                        </span>
                      )}
                      {player.secondaryRegistered && (
                        <span className="bg-amber-100 text-amber-800 px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-xs sm:text-sm font-semibold border border-amber-200">
                          مسجل ثانوي
                        </span>
                      )}
                    </div>

                    {/* Birth Date */}
                    {player.birth_date && (
                      <p className="text-xs sm:text-sm text-gray-700 mb-3 sm:mb-4 font-medium truncate">
                        تاريخ الميلاد: {formatDate(player.birth_date)}
                      </p>
                    )}

                    {/* Action Buttons */}
                    <div className="space-y-2 sm:space-y-3">
                      {activeExam && (
                        <button
                          onClick={() => player.registered ? unregisterPlayer(player) : registerPlayer(player)}
                          className={`w-full flex items-center justify-center gap-1 sm:gap-2 px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm font-bold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 ${
                            player.registered
                              ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white'
                              : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white'
                          }`}
                        >
                          {player.registered ? <XCircle className="w-4 h-4 sm:w-5 sm:h-5" /> : <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />}
                          <span className="hidden sm:inline">{player.registered ? 'إلغاء التسجيل في الاختبار' : 'تسجيل في الاختبار'}</span>
                          <span className="sm:hidden">{player.registered ? 'إلغاء' : 'تسجيل'}</span>
                        </button>
                      )}

                      {activeSecondaryRegistration && (
                        <button
                          onClick={() => player.secondaryRegistered ? unregisterPlayerSecondary(player) : registerPlayerSecondary(player)}
                          className={`w-full flex items-center justify-center gap-1 sm:gap-2 px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm font-bold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 ${
                            player.secondaryRegistered
                              ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white'
                              : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white'
                          }`}
                        >
                          {player.secondaryRegistered ? <XCircle className="w-4 h-4 sm:w-5 sm:h-5" /> : <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />}
                          <span className="hidden sm:inline">{player.secondaryRegistered ? 'إلغاء التسجيل الثانوي' : 'تسجيل ثانوي'}</span>
                          <span className="sm:hidden">{player.secondaryRegistered ? 'إلغاء' : 'ثانوي'}</span>
                        </button>
                      )}
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