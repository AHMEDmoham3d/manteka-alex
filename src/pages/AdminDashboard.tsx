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
  Calendar
} from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase env variables are missing");
}

const supabase = createClient(supabaseUrl, supabaseKey);

const CREATE_COACH_FUNCTION_URL = "https://qnozlrgdqrnayuixtwmd.supabase.co/functions/v1/create-coach";

async function addCoach(email: string, password: string, full_name: string, organization_id: string) {
  try {
    const res = await fetch(CREATE_COACH_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password, full_name, organization_id }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Error adding coach:", data.error);
      throw new Error(data.error || "حدث خطأ أثناء إضافة المدرب");
    }

    console.log("Coach added successfully", data);
    return data;
  } catch (err: any) {
    console.error("Fetch error:", err);
    throw new Error(err.message || "حدث خطأ أثناء الاتصال بالخادم");
  }
}

type TabType = 'organizations' | 'coaches' | 'players' | 'exam_periods';

export default function AdminDashboard() {
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('organizations');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [examPeriods, setExamPeriods] = useState<ExamPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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
            <nav className="flex -mb-px">
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
            </nav>
          </div>

          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {activeTab === 'organizations' && 'النوادي ومراكز الشباب'}
                {activeTab === 'coaches' && 'المدربين'}
                {activeTab === 'players' && 'اللاعبين'}
                {activeTab === 'exam_periods' && 'فترات الاختبار'}
              </h2>
              <button
                onClick={() => {
                  setEditingId(null);
                  setShowModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة جديد</span>
              </button>
            </div>

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
    <table className="w-full">
      <thead>
        <tr className="border-b bg-gray-50">
          <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">الاسم</th>
          <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">النوع</th>
          <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">الإجراءات</th>
        </tr>
      </thead>
      <tbody>
        {organizations.map((org) => (
          <tr key={org.id} className="border-b hover:bg-gray-50">
            <td className="px-6 py-4 text-sm text-gray-900">{org.name}</td>
            <td className="px-6 py-4 text-sm text-gray-600">
              {org.type === 'club' ? 'نادي' : 'مركز شباب'}
            </td>
            <td className="px-6 py-4">
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
            </td>
          </tr>
        ))}
      </tbody>
    </table>
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
    <table className="w-full">
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
  return (
    <table className="w-full">
      <thead>
        <tr className="border-b bg-gray-50">
          <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">الاسم</th>
          <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">المدرب</th>
          <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">الحزام</th>
          <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">العمر</th>
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
            <td className="px-6 py-4 text-sm text-gray-600">{player.age || '-'}</td>
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
  return (
    <table className="w-full">
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
            <td className="px-6 py-4 text-sm text-gray-600">{new Date(period.start_date).toLocaleDateString('ar-EG')}</td>
            <td className="px-6 py-4 text-sm text-gray-600">{new Date(period.end_date).toLocaleDateString('ar-EG')}</td>
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
      }

      const { data, error } = await supabase
        .from(table!)
        .select('*')
        .eq('id', editingId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        if (type === 'exam_periods' && data.start_date) {
          data.start_date = new Date(data.start_date).toISOString().split('T')[0];
        }
        if (type === 'exam_periods' && data.end_date) {
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

      await addCoach(
        formData.email,
        formData.password,
        formData.full_name,
        formData.organization_id
      );
    }
  };

  const savePlayer = async () => {
    const data = {
      full_name: formData.full_name,
      age: formData.age ? parseInt(formData.age) : null,
      belt: formData.belt,
      coach_id: formData.coach_id,
      organization_id: formData.organization_id,
      file_number: formData.file_number ? parseInt(formData.file_number) : null,
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

  const getFormTitle = () => {
    const titles = {
      organizations: 'النوادي والمراكز',
      coaches: 'المدربين',
      players: 'اللاعبين',
      exam_periods: 'فترات الاختبار',
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
                  العمر
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.age || ''}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
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

          {type === 'exam_periods' && (
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