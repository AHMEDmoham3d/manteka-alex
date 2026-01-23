import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createClient } from '@supabase/supabase-js';
import { Organization, Coach, Player, ExamPeriod } from '../lib/supabase';
import {
  LogOut,
  Building2,
  Users,
  UserCircle,
  Plus,
  Trash2,
  Edit2,
  X,
  Calendar,
  ClipboardList,
  Download,
  Trophy,
  Clock
} from 'lucide-react';
import * as XLSX from 'xlsx';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase env variables are missing");
}

const supabase = createClient(supabaseUrl, supabaseKey);

type TabType = 'organizations' | 'coaches' | 'players' | 'exam_periods' | 'exam_registrations' | 'secondary_periods' | 'secondary_registrations' | 'tournament_periods' | 'tournament_registrations';

export default function AdminDashboard() {
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('organizations');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [examPeriods, setExamPeriods] = useState<ExamPeriod[]>([]);
  const [examRegistrations, setExamRegistrations] = useState<any[]>([]);
  const [secondaryPeriods, setSecondaryPeriods] = useState<any[]>([]);
  const [secondaryRegistrations, setSecondaryRegistrations] = useState<any[]>([]);
  const [tournamentPeriods, setTournamentPeriods] = useState<any[]>([]);
  const [tournamentRegistrations, setTournamentRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedExamPeriod, setSelectedExamPeriod] = useState<string>('all');
  const [selectedExamCoach, setSelectedExamCoach] = useState<string>('all');
  const [selectedSecondaryPeriod, setSelectedSecondaryPeriod] = useState<string>('all');
  const [selectedSecondaryCoach, setSelectedSecondaryCoach] = useState<string>('all');
  const [selectedTournamentPeriod, setSelectedTournamentPeriod] = useState<string>('all');
  const [selectedTournamentCoach, setSelectedTournamentCoach] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'organizations') {
        const { data } = await supabase
          .from('organizations')
          .select('*')
          .order('created_at', { ascending: false });
        setOrganizations(data || []);
      } else if (activeTab === 'coaches') {
        const { data } = await supabase
          .from('profiles')
          .select('*, organization:organizations(*)')
          .eq('role', 'coach')
          .order('created_at', { ascending: false });
        setCoaches(data || []);
      } else if (activeTab === 'exam_periods') {
        const { data } = await supabase
          .from('exam_periods')
          .select('*')
          .order('created_at', { ascending: false });
        setExamPeriods(data || []);
      } else if (activeTab === 'secondary_periods') {
        const { data } = await supabase
          .from('secondary_registration_periods')
          .select('*')
          .order('created_at', { ascending: false });
        setSecondaryPeriods(data || []);
      } else if (activeTab === 'tournament_periods') {
        const { data } = await supabase
          .from('tournament_periods')
          .select('*')
          .order('created_at', { ascending: false });
        setTournamentPeriods(data || []);
      } else if (activeTab === 'exam_registrations') {
        await loadExamRegistrations();
      } else if (activeTab === 'secondary_registrations') {
        await loadSecondaryRegistrations();
      } else if (activeTab === 'tournament_registrations') {
        await loadTournamentRegistrations();
      } else {
        const { data } = await supabase
          .from('players')
          .select('*, coach:profiles(*)')
          .order('created_at', { ascending: false });
        setPlayers(data || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadExamRegistrations = async (filters?: { examPeriodId?: string, coachId?: string }) => {
    try {
      let query = supabase
        .from('exam_registrations')
        .select(`
          *,
          exam_period:exam_periods(name, start_date, end_date),
          coach:profiles(full_name),
          player:players(birth_date, file_number)
        `)
        .order('created_at', { ascending: false });

      if (filters?.examPeriodId && filters.examPeriodId !== 'all') {
        query = query.eq('exam_period_id', filters.examPeriodId);
      }

      if (filters?.coachId && filters.coachId !== 'all') {
        query = query.eq('coach_id', filters.coachId);
      }

      const { data } = await query;
      setExamRegistrations(data || []);
    } catch (error) {
      console.error('Error loading exam registrations:', error);
    }
  };

  const loadSecondaryRegistrations = async (filters?: { secondaryPeriodId?: string, coachId?: string }) => {
    try {
      let query = supabase
        .from('secondary_registrations')
        .select(`
          *,
          secondary_period:secondary_registration_periods(name, start_date, end_date),
          coach:profiles(full_name),
          player:players(birth_date, file_number)
        `)
        .order('created_at', { ascending: false });

      if (filters?.secondaryPeriodId && filters.secondaryPeriodId !== 'all') {
        query = query.eq('secondary_period_id', filters.secondaryPeriodId);
      }

      if (filters?.coachId && filters.coachId !== 'all') {
        query = query.eq('coach_id', filters.coachId);
      }

      const { data } = await query;
      setSecondaryRegistrations(data || []);
    } catch (error) {
      console.error('Error loading secondary registrations:', error);
    }
  };

  const loadTournamentRegistrations = async (filters?: { tournamentPeriodId?: string, coachId?: string }) => {
    try {
      let query = supabase
        .from('tournament_registrations')
        .select(`
          *,
          tournament_period:tournament_periods(name, start_date, end_date),
          coach:profiles(full_name),
          player:players(birth_date, file_number)
        `)
        .order('created_at', { ascending: false });

      if (filters?.tournamentPeriodId && filters.tournamentPeriodId !== 'all') {
        query = query.eq('tournament_period_id', filters.tournamentPeriodId);
      }

      if (filters?.coachId && filters.coachId !== 'all') {
        query = query.eq('coach_id', filters.coachId);
      }

      const { data } = await query;
      setTournamentRegistrations(data || []);
    } catch (error) {
      console.error('Error loading tournament registrations:', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'exam_registrations') {
      loadExamRegistrations({
        examPeriodId: selectedExamPeriod,
        coachId: selectedExamCoach
      });
    }
  }, [selectedExamPeriod, selectedExamCoach]);

  useEffect(() => {
    if (activeTab === 'secondary_registrations') {
      loadSecondaryRegistrations({
        secondaryPeriodId: selectedSecondaryPeriod,
        coachId: selectedSecondaryCoach
      });
    }
  }, [selectedSecondaryPeriod, selectedSecondaryCoach]);

  useEffect(() => {
    if (activeTab === 'tournament_registrations') {
      loadTournamentRegistrations({
        tournamentPeriodId: selectedTournamentPeriod,
        coachId: selectedTournamentCoach
      });
    }
  }, [selectedTournamentPeriod, selectedTournamentCoach]);

  const handleDelete = async (id: string, table: string) => {
    if (!confirm('هل أنت متأكد من الحذف؟')) return;

    try {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error deleting:', error);
      alert('حدث خطأ أثناء الحذف');
    }
  };

  const downloadExamRegistrations = () => {
    if (examRegistrations.length === 0) {
      alert('لا يوجد تسجيلات للتحميل');
      return;
    }

    const exportData = examRegistrations.map((reg, index) => {
      const examPeriod = examPeriods.find(ep => ep.id === reg.exam_period_id);
      const coach = coaches.find(c => c.id === reg.coach_id);
      
      return {
        'م': index + 1,
        'اسم اللاعب': reg.player_name,
        'الحزام الأخير': getBeltName(reg.last_belt || 'white'),
        'تاريخ الميلاد': reg.player?.birth_date ? formatDate(reg.player.birth_date) : 'غير محدد',
        'رقم الملف': reg.player?.file_number || 'غير محدد',
        'المدرب': reg.coach?.full_name || 'غير محدد',
        'المؤسسة': coach?.organization?.name || 'غير محدد',
        'فترة الاختبار': examPeriod?.name || 'غير محدد',
        'تاريخ التسجيل': formatDate(reg.created_at),
        'من تاريخ': examPeriod?.start_date ? formatDate(examPeriod.start_date) : 'غير محدد',
        'إلى تاريخ': examPeriod?.end_date ? formatDate(examPeriod.end_date) : 'غير محدد'
      };
    });

    const summary = [
      {},
      {
        'م': 'ملخص',
        'اسم اللاعب': `إجمالي عدد التسجيلات: ${examRegistrations.length}`,
        'الحزام الأخير': `عدد فترات الاختبار: ${examPeriods.length}`,
        'تاريخ الميلاد': `عدد المدربين: ${coaches.length}`,
        'رقم الملف': `تاريخ التحميل: ${new Date().toLocaleDateString('ar-EG')}`,
        'المدرب': `وقت التحميل: ${new Date().toLocaleTimeString('ar-EG')}`,
        'المؤسسة': '',
        'فترة الاختبار': '',
        'تاريخ التسجيل': '',
        'من تاريخ': '',
        'إلى تاريخ': ''
      },
      {}
    ];

    const finalData = [...exportData, ...summary];

    const ws = XLSX.utils.json_to_sheet(finalData, { skipHeader: false });
    
    const wscols = [
      { wch: 5 },
      { wch: 25 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 }
    ];
    ws['!cols'] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'تسجيلات الاختبارات');

    const fileName = `تسجيلات_الاختبارات_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    alert(`تم تحميل ملف ${fileName} بنجاح`);
  };

  const downloadSecondaryRegistrations = () => {
    if (secondaryRegistrations.length === 0) {
      alert('لا يوجد تسجيلات للتحميل');
      return;
    }

    const exportData = secondaryRegistrations.map((reg, index) => {
      const secondaryPeriod = secondaryPeriods.find(sp => sp.id === reg.secondary_period_id);
      const coach = coaches.find(c => c.id === reg.coach_id);
      
      return {
        'م': index + 1,
        'اسم اللاعب': reg.player_name,
        'الحزام الأخير': getBeltName(reg.last_belt || 'white'),
        'تاريخ الميلاد': reg.player?.birth_date ? formatDate(reg.player.birth_date) : 'غير محدد',
        'رقم الملف': reg.player?.file_number || 'غير محدد',
        'المدرب': reg.coach?.full_name || 'غير محدد',
        'المؤسسة': coach?.organization?.name || 'غير محدد',
        'فترة التسجيل الثانوي': secondaryPeriod?.name || 'غير محدد',
        'تاريخ التسجيل': formatDate(reg.created_at),
        'من تاريخ': secondaryPeriod?.start_date ? formatDate(secondaryPeriod.start_date) : 'غير محدد',
        'إلى تاريخ': secondaryPeriod?.end_date ? formatDate(secondaryPeriod.end_date) : 'غير محدد'
      };
    });

    const summary = [
      {},
      {
        'م': 'ملخص',
        'اسم اللاعب': `إجمالي عدد التسجيلات: ${secondaryRegistrations.length}`,
        'الحزام الأخير': `عدد فترات التسجيل الثانوي: ${secondaryPeriods.length}`,
        'تاريخ الميلاد': `عدد المدربين: ${coaches.length}`,
        'رقم الملف': `تاريخ التحميل: ${new Date().toLocaleDateString('ar-EG')}`,
        'المدرب': `وقت التحميل: ${new Date().toLocaleTimeString('ar-EG')}`,
        'المؤسسة': '',
        'فترة التسجيل الثانوي': '',
        'تاريخ التسجيل': '',
        'من تاريخ': '',
        'إلى تاريخ': ''
      },
      {}
    ];

    const finalData = [...exportData, ...summary];

    const ws = XLSX.utils.json_to_sheet(finalData, { skipHeader: false });
    
    const wscols = [
      { wch: 5 },
      { wch: 25 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 }
    ];
    ws['!cols'] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'تسجيلات التسجيل الثانوي');

    const fileName = `تسجيلات_التسجيل_الثانوي_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    alert(`تم تحميل ملف ${fileName} بنجاح`);
  };

  const downloadTournamentRegistrations = () => {
    if (tournamentRegistrations.length === 0) {
      alert('لا يوجد تسجيلات للتحميل');
      return;
    }

    const exportData = tournamentRegistrations.map((reg, index) => {
      const tournamentPeriod = tournamentPeriods.find(tp => tp.id === reg.tournament_period_id);
      const coach = coaches.find(c => c.id === reg.coach_id);
      
      return {
        'م': index + 1,
        'اسم اللاعب': reg.player_name,
        'الحزام الأخير': getBeltName(reg.last_belt || 'white'),
        'تاريخ الميلاد': reg.player?.birth_date ? formatDate(reg.player.birth_date) : 'غير محدد',
        'رقم الملف': reg.player?.file_number || 'غير محدد',
        'المدرب': reg.coach?.full_name || 'غير محدد',
        'المؤسسة': coach?.organization?.name || 'غير محدد',
        'فترة البطولة': tournamentPeriod?.name || 'غير محدد',
        'تاريخ التسجيل': formatDate(reg.created_at),
        'من تاريخ': tournamentPeriod?.start_date ? formatDate(tournamentPeriod.start_date) : 'غير محدد',
        'إلى تاريخ': tournamentPeriod?.end_date ? formatDate(tournamentPeriod.end_date) : 'غير محدد'
      };
    });

    const summary = [
      {},
      {
        'م': 'ملخص',
        'اسم اللاعب': `إجمالي عدد التسجيلات: ${tournamentRegistrations.length}`,
        'الحزام الأخير': `عدد فترات البطولات: ${tournamentPeriods.length}`,
        'تاريخ الميلاد': `عدد المدربين: ${coaches.length}`,
        'رقم الملف': `تاريخ التحميل: ${new Date().toLocaleDateString('ar-EG')}`,
        'المدرب': `وقت التحميل: ${new Date().toLocaleTimeString('ar-EG')}`,
        'المؤسسة': '',
        'فترة البطولة': '',
        'تاريخ التسجيل': '',
        'من تاريخ': '',
        'إلى تاريخ': ''
      },
      {}
    ];

    const finalData = [...exportData, ...summary];

    const ws = XLSX.utils.json_to_sheet(finalData, { skipHeader: false });
    
    const wscols = [
      { wch: 5 },
      { wch: 25 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 }
    ];
    ws['!cols'] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'تسجيلات البطولات');

    const fileName = `تسجيلات_البطولات_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    alert(`تم تحميل ملف ${fileName} بنجاح`);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'غير محدد';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG');
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

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                لوحة تحكم الإدارة
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                نظام إدارة الكاراتيه - منطقة الإسكندرية
              </p>
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
        <div className="bg-white rounded-xl shadow-sm border mb-6">
          <div className="border-b">
            <nav className="flex -mb-px overflow-x-auto">
              <button
                onClick={() => setActiveTab('organizations')}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition ${
                  activeTab === 'organizations'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Building2 className="w-5 h-5" />
                <span>النوادي والمراكز</span>
              </button>
              <button
                onClick={() => setActiveTab('coaches')}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition ${
                  activeTab === 'coaches'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Users className="w-5 h-5" />
                <span>المدربين</span>
              </button>
              <button
                onClick={() => setActiveTab('players')}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition ${
                  activeTab === 'players'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <UserCircle className="w-5 h-5" />
                <span>اللاعبين</span>
              </button>
              <button
                onClick={() => setActiveTab('exam_periods')}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition ${
                  activeTab === 'exam_periods'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Calendar className="w-5 h-5" />
                <span>فترات الاختبار</span>
              </button>
              <button
                onClick={() => setActiveTab('secondary_periods')}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition ${
                  activeTab === 'secondary_periods'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Clock className="w-5 h-5" />
                <span>فترات التسجيل الثانوي</span>
              </button>
              <button
                onClick={() => setActiveTab('tournament_periods')}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition ${
                  activeTab === 'tournament_periods'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Trophy className="w-5 h-5" />
                <span>فترات البطولات</span>
              </button>
              <button
                onClick={() => setActiveTab('exam_registrations')}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition ${
                  activeTab === 'exam_registrations'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <ClipboardList className="w-5 h-5" />
                <span>تسجيلات الاختبارات</span>
              </button>
              <button
                onClick={() => setActiveTab('secondary_registrations')}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition ${
                  activeTab === 'secondary_registrations'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Clock className="w-5 h-5" />
                <span>تسجيلات التسجيل الثانوي</span>
              </button>
              <button
                onClick={() => setActiveTab('tournament_registrations')}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition ${
                  activeTab === 'tournament_registrations'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Trophy className="w-5 h-5" />
                <span>تسجيلات البطولات</span>
              </button>
            </nav>
          </div>

          <div className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                {activeTab === 'organizations' && 'النوادي ومراكز الشباب'}
                {activeTab === 'coaches' && 'المدربين'}
                {activeTab === 'players' && 'اللاعبين'}
                {activeTab === 'exam_periods' && 'فترات الاختبار'}
                {activeTab === 'secondary_periods' && 'فترات التسجيل الثانوي'}
                {activeTab === 'tournament_periods' && 'فترات البطولات'}
                {activeTab === 'exam_registrations' && 'تسجيلات الاختبارات'}
                {activeTab === 'secondary_registrations' && 'تسجيلات التسجيل الثانوي'}
                {activeTab === 'tournament_registrations' && 'تسجيلات البطولات'}
              </h2>
              {activeTab !== 'exam_registrations' && activeTab !== 'secondary_registrations' && activeTab !== 'tournament_registrations' && (
                <button
                  onClick={() => {
                    setEditingId(null);
                    setShowModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition w-full sm:w-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة جديد</span>
                </button>
              )}
            </div>

            {activeTab === 'exam_registrations' && (
              <div className="mb-6 bg-blue-50 p-4 rounded-lg">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      تصفية حسب فترة الاختبار
                    </label>
                    <select
                      value={selectedExamPeriod}
                      onChange={(e) => setSelectedExamPeriod(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">جميع فترات الاختبار</option>
                      {examPeriods.map((period) => (
                        <option key={period.id} value={period.id}>
                          {period.name} ({formatDate(period.start_date)} - {formatDate(period.end_date)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      تصفية حسب المدرب
                    </label>
                    <select
                      value={selectedExamCoach}
                      onChange={(e) => setSelectedExamCoach(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">جميع المدربين</option>
                      {coaches.map((coach) => (
                        <option key={coach.id} value={coach.id}>
                          {coach.full_name} ({coach.organization?.name})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={downloadExamRegistrations}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition h-10"
                    >
                      <Download className="w-4 h-4" />
                      <span>تحميل التقرير</span>
                    </button>
                  </div>
                </div>
                <div className="mt-4 text-sm text-blue-700">
                  عدد التسجيلات: <span className="font-bold">{examRegistrations.length}</span>
                </div>
              </div>
            )}

            {activeTab === 'secondary_registrations' && (
              <div className="mb-6 bg-amber-50 p-4 rounded-lg">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      تصفية حسب فترة التسجيل الثانوي
                    </label>
                    <select
                      value={selectedSecondaryPeriod}
                      onChange={(e) => setSelectedSecondaryPeriod(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    >
                      <option value="all">جميع فترات التسجيل الثانوي</option>
                      {secondaryPeriods.map((period) => (
                        <option key={period.id} value={period.id}>
                          {period.name} ({formatDate(period.start_date)} - {formatDate(period.end_date)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      تصفية حسب المدرب
                    </label>
                    <select
                      value={selectedSecondaryCoach}
                      onChange={(e) => setSelectedSecondaryCoach(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    >
                      <option value="all">جميع المدربين</option>
                      {coaches.map((coach) => (
                        <option key={coach.id} value={coach.id}>
                          {coach.full_name} ({coach.organization?.name})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={downloadSecondaryRegistrations}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition h-10"
                    >
                      <Download className="w-4 h-4" />
                      <span>تحميل التقرير</span>
                    </button>
                  </div>
                </div>
                <div className="mt-4 text-sm text-amber-700">
                  عدد التسجيلات: <span className="font-bold">{secondaryRegistrations.length}</span>
                </div>
              </div>
            )}

            {activeTab === 'tournament_registrations' && (
              <div className="mb-6 bg-purple-50 p-4 rounded-lg">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      تصفية حسب فترة البطولة
                    </label>
                    <select
                      value={selectedTournamentPeriod}
                      onChange={(e) => setSelectedTournamentPeriod(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="all">جميع فترات البطولات</option>
                      {tournamentPeriods.map((period) => (
                        <option key={period.id} value={period.id}>
                          {period.name} ({formatDate(period.start_date)} - {formatDate(period.end_date)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      تصفية حسب المدرب
                    </label>
                    <select
                      value={selectedTournamentCoach}
                      onChange={(e) => setSelectedTournamentCoach(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="all">جميع المدربين</option>
                      {coaches.map((coach) => (
                        <option key={coach.id} value={coach.id}>
                          {coach.full_name} ({coach.organization?.name})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={downloadTournamentRegistrations}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition h-10"
                    >
                      <Download className="w-4 h-4" />
                      <span>تحميل التقرير</span>
                    </button>
                  </div>
                </div>
                <div className="mt-4 text-sm text-purple-700">
                  عدد التسجيلات: <span className="font-bold">{tournamentRegistrations.length}</span>
                </div>
              </div>
            )}

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                {activeTab === 'organizations' && (
                  <OrganizationsTable
                    organizations={organizations}
                    onDelete={(id) => handleDelete(id, 'organizations')}
                    onEdit={(id) => {
                      setEditingId(id);
                      setShowModal(true);
                    }}
                  />
                )}
                {activeTab === 'coaches' && (
                  <CoachesTable
                    coaches={coaches}
                    onDelete={(id) => handleDelete(id, 'profiles')}
                    onEdit={(id) => {
                      setEditingId(id);
                      setShowModal(true);
                    }}
                  />
                )}
                {activeTab === 'players' && (
                  <PlayersTable
                    players={players}
                    onDelete={(id) => handleDelete(id, 'players')}
                    onEdit={(id) => {
                      setEditingId(id);
                      setShowModal(true);
                    }}
                  />
                )}
                {activeTab === 'exam_periods' && (
                  <ExamPeriodsTable
                    examPeriods={examPeriods}
                    onDelete={(id) => handleDelete(id, 'exam_periods')}
                    onEdit={(id) => {
                      setEditingId(id);
                      setShowModal(true);
                    }}
                  />
                )}
                {activeTab === 'secondary_periods' && (
                  <SecondaryPeriodsTable
                    secondaryPeriods={secondaryPeriods}
                    onDelete={(id) => handleDelete(id, 'secondary_registration_periods')}
                    onEdit={(id) => {
                      setEditingId(id);
                      setShowModal(true);
                    }}
                  />
                )}
                {activeTab === 'tournament_periods' && (
                  <TournamentPeriodsTable
                    tournamentPeriods={tournamentPeriods}
                    onDelete={(id) => handleDelete(id, 'tournament_periods')}
                    onEdit={(id) => {
                      setEditingId(id);
                      setShowModal(true);
                    }}
                  />
                )}
                {activeTab === 'exam_registrations' && (
                  <RegistrationsTable
                    registrations={examRegistrations}
                    onDelete={(id) => handleDelete(id, 'exam_registrations')}
                    coaches={coaches}
                    type="exam"
                  />
                )}
                {activeTab === 'secondary_registrations' && (
                  <RegistrationsTable
                    registrations={secondaryRegistrations}
                    onDelete={(id) => handleDelete(id, 'secondary_registrations')}
                    coaches={coaches}
                    type="secondary"
                  />
                )}
                {activeTab === 'tournament_registrations' && (
                  <RegistrationsTable
                    registrations={tournamentRegistrations}
                    onDelete={(id) => handleDelete(id, 'tournament_registrations')}
                    coaches={coaches}
                    type="tournament"
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <FormModal
          type={activeTab}
          editingId={editingId}
          onClose={() => {
            setShowModal(false);
            setEditingId(null);
          }}
          onSuccess={() => {
            setShowModal(false);
            setEditingId(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

function OrganizationsTable({
  organizations,
  onDelete,
  onEdit,
}: {
  organizations: Organization[];
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  return (
    <div className="block space-y-4">
      {organizations.map((org) => (
        <div key={org.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="font-semibold text-gray-900">{org.name}</h3>
              <p className="text-sm text-gray-600">
                {org.type === 'club' ? 'نادي' : 'مركز شباب'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(org.id)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(org.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
    </div>
  );
}

function CoachesTable({
  coaches,
  onDelete,
  onEdit,
}: {
  coaches: Coach[];
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  return (
    <>
      <div className="block lg:hidden space-y-4">
        {coaches.map((coach) => (
          <div key={coach.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">{coach.full_name}</h3>
                <p className="text-sm text-gray-600">
                  {coach.role === 'coach' ? 'مدرب' : 'مدير'}
                </p>
                <p className="text-sm text-gray-600">
                  {coach.organization?.name}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onEdit(coach.id)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(coach.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <table className="hidden lg:block w-full">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">الاسم</th>
            <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">الدور</th>
            <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">المؤسسة</th>
            <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {coaches.map((coach) => (
            <tr key={coach.id} className="border-b hover:bg-gray-50">
              <td className="px-6 py-4 text-sm text-gray-900">{coach.full_name}</td>
              <td className="px-6 py-4 text-sm text-gray-600">
                {coach.role === 'coach' ? 'مدرب' : 'مدير'}
              </td>
              <td className="px-6 py-4 text-sm text-gray-600">
                {coach.organization?.name}
              </td>
              <td className="px-6 py-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => onEdit(coach.id)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(coach.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function PlayersTable({
  players,
  onDelete,
  onEdit,
}: {
  players: Player[];
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  const formatDate = (dateString: string) => {
    if (!dateString) return 'غير محدد';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG');
  };

  return (
    <table className="w-full">
      <thead>
        <tr className="border-b bg-gray-50">
          <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">الاسم</th>
          <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">المدرب</th>
          <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">الحزام</th>
          <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">تاريخ الميلاد</th>
          <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">رقم الملف</th>
          <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">الإجراءات</th>
        </tr>
      </thead>
      <tbody>
        {players.map((player) => (
          <tr key={player.id} className="border-b hover:bg-gray-50">
            <td className="px-6 py-4 text-sm text-gray-900">{player.full_name}</td>
            <td className="px-6 py-4 text-sm text-gray-600">{player.coach?.full_name}</td>
            <td className="px-6 py-4 text-sm text-gray-600">
              {player.belt === 'white' ? 'أبيض' : 
               player.belt === 'yellow' ? 'أصفر' :
               player.belt === 'orange' ? 'برتقالي' :
               player.belt === 'green' ? 'أخضر' :
               player.belt === 'blue' ? 'أزرق' :
               player.belt === 'brown' ? 'بني' :
               player.belt === 'black' ? 'أسود' : player.belt}
            </td>
            <td className="px-6 py-4 text-sm text-gray-600">
              {player.birth_date ? formatDate(player.birth_date) : '-'}
            </td>
            <td className="px-6 py-4 text-sm text-gray-900">{player.file_number}</td>
            <td className="px-6 py-4">
              <div className="flex gap-2">
                <button
                  onClick={() => onEdit(player.id)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(player.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ExamPeriodsTable({
  examPeriods,
  onDelete,
  onEdit,
}: {
  examPeriods: ExamPeriod[];
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  const formatDate = (dateString: string) => {
    if (!dateString) return 'غير محدد';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG');
  };

  return (
    <>
      <div className="block lg:hidden space-y-4">
        {examPeriods.map((period) => (
          <div key={period.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">{period.name}</h3>
                <p className="text-sm text-gray-600">
                  من: {formatDate(period.start_date)}
                </p>
                <p className="text-sm text-gray-600">
                  إلى: {formatDate(period.end_date)}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onEdit(period.id)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(period.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <table className="hidden lg:block w-full">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">الاسم</th>
            <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">تاريخ البداية</th>
            <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">تاريخ النهاية</th>
            <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {examPeriods.map((period) => (
            <tr key={period.id} className="border-b hover:bg-gray-50">
              <td className="px-6 py-4 text-sm text-gray-900">{period.name}</td>
              <td className="px-6 py-4 text-sm text-gray-600">{formatDate(period.start_date)}</td>
              <td className="px-6 py-4 text-sm text-gray-600">{formatDate(period.end_date)}</td>
              <td className="px-6 py-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => onEdit(period.id)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(period.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function SecondaryPeriodsTable({
  secondaryPeriods,
  onDelete,
  onEdit,
}: {
  secondaryPeriods: any[];
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  const formatDate = (dateString: string) => {
    if (!dateString) return 'غير محدد';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG');
  };

  return (
    <>
      <div className="block lg:hidden space-y-4">
        {secondaryPeriods.map((period) => (
          <div key={period.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">{period.name}</h3>
                <p className="text-sm text-gray-600">
                  من: {formatDate(period.start_date)}
                </p>
                <p className="text-sm text-gray-600">
                  إلى: {formatDate(period.end_date)}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onEdit(period.id)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(period.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <table className="hidden lg:block w-full">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">الاسم</th>
            <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">تاريخ البداية</th>
            <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">تاريخ النهاية</th>
            <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {secondaryPeriods.map((period) => (
            <tr key={period.id} className="border-b hover:bg-gray-50">
              <td className="px-6 py-4 text-sm text-gray-900">{period.name}</td>
              <td className="px-6 py-4 text-sm text-gray-600">{formatDate(period.start_date)}</td>
              <td className="px-6 py-4 text-sm text-gray-600">{formatDate(period.end_date)}</td>
              <td className="px-6 py-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => onEdit(period.id)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(period.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function TournamentPeriodsTable({
  tournamentPeriods,
  onDelete,
  onEdit,
}: {
  tournamentPeriods: any[];
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  const formatDate = (dateString: string) => {
    if (!dateString) return 'غير محدد';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG');
  };

  return (
    <>
      <div className="block lg:hidden space-y-4">
        {tournamentPeriods.map((period) => (
          <div key={period.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">{period.name}</h3>
                <p className="text-sm text-gray-600">
                  من: {formatDate(period.start_date)}
                </p>
                <p className="text-sm text-gray-600">
                  إلى: {formatDate(period.end_date)}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onEdit(period.id)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(period.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <table className="hidden lg:block w-full">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">الاسم</th>
            <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">تاريخ البداية</th>
            <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">تاريخ النهاية</th>
            <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {tournamentPeriods.map((period) => (
            <tr key={period.id} className="border-b hover:bg-gray-50">
              <td className="px-6 py-4 text-sm text-gray-900">{period.name}</td>
              <td className="px-6 py-4 text-sm text-gray-600">{formatDate(period.start_date)}</td>
              <td className="px-6 py-4 text-sm text-gray-600">{formatDate(period.end_date)}</td>
              <td className="px-6 py-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => onEdit(period.id)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(period.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function RegistrationsTable({
  registrations,
  onDelete,
  coaches,
  type = 'exam'
}: {
  registrations: any[];
  onDelete: (id: string) => void;
  coaches: Coach[];
  type?: 'exam' | 'secondary' | 'tournament';
}) {
  const formatDate = (dateString: string) => {
    if (!dateString) return 'غير محدد';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG');
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

  const getCoachOrganization = (coachId: string) => {
    const coach = coaches.find(c => c.id === coachId);
    return coach?.organization?.name || 'غير محدد';
  };

  const getPeriodName = (reg: any) => {
    if (type === 'exam') {
      return reg.exam_period?.name || 'غير محدد';
    } else if (type === 'secondary') {
      return reg.secondary_period?.name || 'غير محدد';
    } else {
      return reg.tournament_period?.name || 'غير محدد';
    }
  };

  const getPeriodField = () => {
    if (type === 'exam') return 'الاختبار';
    if (type === 'secondary') return 'التسجيل الثانوي';
    return 'البطولة';
  };

  return (
    <>
      <div className="block lg:hidden space-y-4">
        {registrations.map((reg) => (
          <div key={reg.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">{reg.player_name}</h3>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">المدرب:</span> {reg.coach?.full_name || 'غير محدد'}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">المؤسسة:</span> {getCoachOrganization(reg.coach_id)}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">{getPeriodField()}:</span> {getPeriodName(reg)}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">الحزام:</span> 
                  <span className={`mr-2 px-2 py-1 rounded-full text-xs ${getBeltColor(reg.last_belt || 'white')}`}>
                    {getBeltName(reg.last_belt || 'white')}
                  </span>
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">تاريخ الميلاد:</span> {reg.player?.birth_date ? formatDate(reg.player.birth_date) : 'غير محدد'}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">التسجيل:</span> {formatDate(reg.created_at)}
                </p>
              </div>
              <div>
                <button
                  onClick={() => onDelete(reg.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <table className="hidden lg:block w-full">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">اسم اللاعب</th>
            <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">الحزام</th>
            <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">تاريخ الميلاد</th>
            <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">المدرب</th>
            <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">المؤسسة</th>
            <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">{getPeriodField()}</th>
            <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">تاريخ التسجيل</th>
            <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {registrations.map((reg) => (
            <tr key={reg.id} className="border-b hover:bg-gray-50">
              <td className="px-6 py-4 text-sm text-gray-900">{reg.player_name}</td>
              <td className="px-6 py-4 text-sm">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getBeltColor(reg.last_belt || 'white')}`}>
                  {getBeltName(reg.last_belt || 'white')}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-600">
                {reg.player?.birth_date ? formatDate(reg.player.birth_date) : 'غير محدد'}
              </td>
              <td className="px-6 py-4 text-sm text-gray-600">{reg.coach?.full_name || 'غير محدد'}</td>
              <td className="px-6 py-4 text-sm text-gray-600">{getCoachOrganization(reg.coach_id)}</td>
              <td className="px-6 py-4 text-sm text-gray-600">{getPeriodName(reg)}</td>
              <td className="px-6 py-4 text-sm text-gray-600">{formatDate(reg.created_at)}</td>
              <td className="px-6 py-4">
                <button
                  onClick={() => onDelete(reg.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function FormModal({
  type,
  editingId,
  onClose,
  onSuccess,
}: {
  type: TabType;
  editingId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const loadInitialData = async () => {
      if (type === 'coaches') {
        await loadOrganizations();
      } else if (type === 'players') {
        await loadCoaches();
        await loadOrganizations();
      }

      if (editingId) {
        await loadExistingData();
      }
    };

    loadInitialData();
  }, [type, editingId]);

  const loadOrganizations = async () => {
    const { data } = await supabase.from('organizations').select('*').order('name');
    setOrganizations(data || []);
  };

  const loadCoaches = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'coach')
      .order('full_name');
    setCoaches(data || []);
  };

  const loadExistingData = async () => {
    try {
      let table;

      if (type === 'organizations') {
        table = 'organizations';
      } else if (type === 'coaches') {
        table = 'profiles';
      } else if (type === 'players') {
        table = 'players';
      } else if (type === 'exam_periods') {
        table = 'exam_periods';
      } else if (type === 'secondary_periods') {
        table = 'secondary_registration_periods';
      } else if (type === 'tournament_periods') {
        table = 'tournament_periods';
      }

      const { data, error } = await supabase
        .from(table!)
        .select('*')
        .eq('id', editingId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        if ((type === 'exam_periods' || type === 'secondary_periods' || type === 'tournament_periods') && data.start_date) {
          data.start_date = new Date(data.start_date).toISOString().split('T')[0];
        }
        if ((type === 'exam_periods' || type === 'secondary_periods' || type === 'tournament_periods') && data.end_date) {
          data.end_date = new Date(data.end_date).toISOString().split('T')[0];
        }
        setFormData(data);
      }
    } catch (error) {
      console.error('Error loading existing data:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFormError(null);

    try {
      if (type === 'organizations') {
        await saveOrganization();
      } else if (type === 'coaches') {
        await saveCoach();
      } else if (type === 'players') {
        await savePlayer();
      } else if (type === 'exam_periods') {
        await saveExamPeriod();
      } else if (type === 'secondary_periods') {
        await saveSecondaryPeriod();
      } else if (type === 'tournament_periods') {
        await saveTournamentPeriod();
      }
      onSuccess();
    } catch (error: any) {
      console.error('Error saving:', error);
      setFormError(error.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setLoading(false);
    }
  };

  const saveOrganization = async () => {
    const data = {
      name: formData.name,
      type: formData.type,
    };

    if (editingId) {
      const { error } = await supabase
        .from('organizations')
        .update(data)
        .eq('id', editingId);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('organizations').insert([data]);
      if (error) throw error;
    }
  };

  const saveCoach = async () => {
    if (editingId) {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          organization_id: formData.organization_id,
        })
        .eq('id', editingId);
      if (error) throw error;
    } else {
      if (!formData.email || !formData.password) {
        throw new Error('البريد الإلكتروني وكلمة المرور مطلوبان');
      }

      const { data: user, error: signUpError } = await supabase.auth.admin.createUser({
        email: formData.email,
        password: formData.password,
      });
      if (signUpError) throw signUpError;

      const { error: insertError } = await supabase
        .from('profiles')
        .insert([{
          id: user.user.id,
          full_name: formData.full_name,
          role: 'coach',
          organization_id: formData.organization_id
        }]);
      if (insertError) throw insertError;
    }
  };

  const savePlayer = async () => {
    const data = {
      full_name: formData.full_name,
      belt: formData.belt,
      coach_id: formData.coach_id,
      organization_id: formData.organization_id,
      file_number: formData.file_number ? parseInt(formData.file_number) : null,
      birth_date: formData.birth_date || null,
    };

    if (editingId) {
      const { error } = await supabase
        .from('players')
        .update(data)
        .eq('id', editingId);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('players').insert([data]);
      if (error) throw error;
    }
  };

  const saveExamPeriod = async () => {
    const data = {
      name: formData.name,
      start_date: formData.start_date,
      end_date: formData.end_date,
    };

    if (editingId) {
      const { error } = await supabase
        .from('exam_periods')
        .update(data)
        .eq('id', editingId);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('exam_periods').insert([data]);
      if (error) throw error;
    }
  };

  const saveSecondaryPeriod = async () => {
    const data = {
      name: formData.name,
      start_date: formData.start_date,
      end_date: formData.end_date,
    };

    if (editingId) {
      const { error } = await supabase
        .from('secondary_registration_periods')
        .update(data)
        .eq('id', editingId);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('secondary_registration_periods').insert([data]);
      if (error) throw error;
    }
  };

  const saveTournamentPeriod = async () => {
    const data = {
      name: formData.name,
      start_date: formData.start_date,
      end_date: formData.end_date,
    };

    if (editingId) {
      const { error } = await supabase
        .from('tournament_periods')
        .update(data)
        .eq('id', editingId);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('tournament_periods').insert([data]);
      if (error) throw error;
    }
  };

  const getFormTitle = () => {
    const titles = {
      organizations: 'النوادي والمراكز',
      coaches: 'المدربين',
      players: 'اللاعبين',
      exam_periods: 'فترات الاختبار',
      secondary_periods: 'فترات التسجيل الثانوي',
      tournament_periods: 'فترات البطولات',
    };
    return `${editingId ? 'تعديل' : 'إضافة'} ${titles[type]}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            {getFormTitle()}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {formError}
            </div>
          )}

          {type === 'organizations' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الاسم
                </label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  النوع
                </label>
                <select
                  required
                  value={formData.type || ''}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">اختر النوع</option>
                  <option value="club">نادي</option>
                  <option value="youth_center">مركز شباب</option>
                </select>
              </div>
            </>
          )}

          {type === 'coaches' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الاسم الكامل
                </label>
                <input
                  type="text"
                  required
                  value={formData.full_name || ''}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              {!editingId && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      البريد الإلكتروني
                    </label>
                    <input
                      type="email"
                      required={!editingId}
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      كلمة المرور
                    </label>
                    <input
                      type="password"
                      required={!editingId}
                      value={formData.password || ''}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  المؤسسة
                </label>
                <select
                  required
                  value={formData.organization_id || ''}
                  onChange={(e) => setFormData({ ...formData, organization_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">اختر المؤسسة</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {type === 'players' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الاسم الكامل
                </label>
                <input
                  type="text"
                  required
                  value={formData.full_name || ''}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  المدرب
                </label>
                <select
                  required
                  value={formData.coach_id || ''}
                  onChange={(e) => setFormData({ ...formData, coach_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">اختر المدرب</option>
                  {coaches.map((coach) => (
                    <option key={coach.id} value={coach.id}>
                      {coach.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  المؤسسة
                </label>
                <select
                  value={formData.organization_id || ''}
                  onChange={(e) => setFormData({ ...formData, organization_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">اختر المؤسسة (اختياري)</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  تاريخ الميلاد
                </label>
                <input
                  type="date"
                  value={formData.birth_date || ''}
                  onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الحزام
                </label>
                <select
                  required
                  value={formData.belt || 'white'}
                  onChange={(e) => setFormData({ ...formData, belt: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="white">أبيض</option>
                  <option value="yellow">أصفر</option>
                  <option value="orange">برتقالي</option>
                  <option value="green">أخضر</option>
                  <option value="blue">أزرق</option>
                  <option value="brown">بني</option>
                  <option value="black">أسود</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  رقم الملف
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.file_number || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, file_number: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </>
          )}

          {(type === 'exam_periods' || type === 'secondary_periods' || type === 'tournament_periods') && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  اسم الفترة
                </label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  تاريخ البداية
                </label>
                <input
                  type="date"
                  required
                  value={formData.start_date || ''}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  تاريخ النهاية
                </label>
                <input
                  type="date"
                  required
                  value={formData.end_date || ''}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'جاري الحفظ...' : 'حفظ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}