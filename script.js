// تكوين API
const API_URL = 'https://script.google.com/macros/s/AKfycbxL6OBodRQ0t_Ag3xXikue2RfTOi-UxYbayEwZ9fIXeVmHgTsCWc9JHXPx0Ns5Rijf4/exec';

// ✅ تسجيل حساب جديد
document.getElementById('btnRegister')?.addEventListener('click', async () => {
  const username = document.getElementById('regUsername').value.trim();
  const password = document.getElementById('regPass').value.trim();
  const regMsg = document.getElementById('regMsg');

  if (!username || !password) {
    showMessage(regMsg, 'يرجى إدخال اسم المستخدم وكلمة المرور.', 'error');
    return;
  }

  if (password.length < 6) {
    showMessage(regMsg, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.', 'error');
    return;
  }

  let users = JSON.parse(localStorage.getItem('users')) || [];
  if (users.find(u => u.username === username)) {
    showMessage(regMsg, '⚠️ اسم المستخدم موجود مسبقًا.', 'error');
    return;
  }

  users.push({ username, password });
  localStorage.setItem('users', JSON.stringify(users));
  showMessage(regMsg, '✅ تم إنشاء الحساب! سيتم تحويلك...', 'success');
  setTimeout(() => window.location.href = 'index.html', 2000);
});

// ✅ تسجيل الدخول
document.getElementById('btnLogin')?.addEventListener('click', () => {
  const username = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value.trim();
  const loginMsg = document.getElementById('loginMsg');

  let users = JSON.parse(localStorage.getItem('users')) || [];
  const match = users.find(u => u.username === username && u.password === password);

  if (match) {
    localStorage.setItem('loggedIn', 'true');
    window.location.href = 'dashboard.html';
  } else {
    showMessage(loginMsg, '❌ اسم المستخدم أو كلمة المرور غير صحيحة.', 'error');
  }
});

// ✅ تأمين الصفحات
function checkAuth() {
  if (window.location.pathname.includes('dashboard') && !localStorage.getItem('loggedIn')) {
    window.location.href = 'index.html';
  }
  
  if ((window.location.pathname.includes('index') || window.location.pathname.includes('register')) && 
      localStorage.getItem('loggedIn')) {
    window.location.href = 'dashboard.html';
  }
}

// ✅ أسماء الحقول بالعربية
const fieldMap = {
  fname: "الاسم",
  lname: "اللقب",
  dob: "تاريخ الميلاد",
  regNo: "رقم التسجيل",
  regPassStud: "الرقم السري",
  stream: "الشعبة",
  phase1: "مرحلة التسجيل الأولي",
  phase2: "مرحلة تأكيد التسجيل",
  pedDate: "تاريخ التسجيل البيداغوجي",
  socDate: "تاريخ تسجيل الخدمات الجامعية",
  wish: "الرغبة",
  major: "التخصص",
  state: "الولاية",
  payNotes: "حالة الدفع",
  grade: "المعدل"
};

const formEls = Object.keys(fieldMap);

// ✅ تجميع البيانات
function gather() {
  let obj = {};
  formEls.forEach(id => {
    const element = document.getElementById(id);
    obj[fieldMap[id]] = element.type === 'date' ? formatDate(element.value) : element.value;
  });
  return obj;
}

// ✅ تعبئة النموذج
function fill(data) {
  for (const [id, arabic] of Object.entries(fieldMap)) {
    const element = document.getElementById(id);
    if (element) {
      element.value = data[arabic] || '';
    }
  }
}

// ✅ إرسال البيانات إلى Google Sheets
async function postToSheet(payload, action) {
  try {
    const response = await fetch(`${API_URL}?action=${action}`, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) throw new Error('فشل في الاتصال بالخادم');
    
    return await response.json();
  } catch (error) {
    console.error('Error:', error);
    return { error: error.message };
  }
}

// ✅ معالجات الأزرار
window.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  
  const msg = document.getElementById('statusMsg');
  
  // إضافة طالب جديد
  document.getElementById('addStud')?.addEventListener('click', async () => {
    const regNo = document.getElementById('regNo').value.trim();
    if (!regNo) return showMessage(msg, "⚠️ يرجى إدخال رقم التسجيل", "error");
    
    const requiredFields = ['lname', 'fname', 'dob', 'stream', 'grade'];
    const missingFields = requiredFields.filter(field => !document.getElementById(field).value.trim());
    
    if (missingFields.length > 0) {
      return showMessage(msg, `⚠️ يرجى إدخال الحقول المطلوبة: ${missingFields.map(f => fieldMap[f]).join(', ')}`, "error");
    }
    
    showMessage(msg, "جاري معالجة الطلب...", "info");
    
    try {
      const existingStudent = await postToSheet({ "رقم التسجيل": regNo }, 'get');
      
      if (existingStudent && !existingStudent.error) {
        showMessage(msg, "❌ هذا الطالب مسجل مسبقا.", "error");
      } else {
        const result = await postToSheet(gather(), 'add');
        if (result.error) {
          showMessage(msg, `⚠️ ${result.error}`, "error");
        } else {
          showMessage(msg, "✅ تمت إضافة الطالب بنجاح", "success");
          setTimeout(() => document.getElementById('clearForm').click(), 1500);
        }
      }
    } catch (error) {
      showMessage(msg, "⚠️ حدث خطأ في الاتصال بالخادم.", "error");
    }
  });
  
  // حذف طالب
  document.getElementById('delStud')?.addEventListener('click', async () => {
    const regNo = document.getElementById('regNo').value.trim();
    if (!regNo) return showMessage(msg, "⚠️ أدخل رقم التسجيل لحذف الطالب", "error");
    
    const confirmDelete = confirm("هل أنت متأكد من حذف هذا الطالب؟");
    if (!confirmDelete) return;
    
    showMessage(msg, "جاري حذف الطالب...", "info");
    
    try {
      const result = await postToSheet({ "رقم التسجيل": regNo }, 'delete');
      if (result.error) {
        showMessage(msg, `⚠️ ${result.error}`, "error");
      } else {
        showMessage(msg, "✅ تم حذف الطالب بنجاح", "success");
        document.getElementById('clearForm').click();
      }
    } catch (error) {
      showMessage(msg, "⚠️ حدث خطأ أثناء الحذف", "error");
    }
  });
  
  // مسح النموذج
  document.getElementById('clearForm')?.addEventListener('click', () => {
    formEls.forEach(id => document.getElementById(id).value = '');
    showMessage(msg, 'تم تفريغ النموذج', 'info');
  });
  
  // جلب بيانات طالب
  document.getElementById('getStud')?.addEventListener('click', async () => {
    const regNo = document.getElementById('regNo').value.trim();
    if (!regNo) return showMessage(msg, "⚠️ أدخل رقم التسجيل للبحث", "error");
    
    showMessage(msg, "جاري البحث عن الطالب...", "info");
    
    try {
      const result = await postToSheet({ "رقم التسجيل": regNo }, 'get');
      
      if (result.error) {
        showMessage(msg, `⚠️ ${result.error}`, "error");
      } else if (Object.keys(result).length === 0) {
        showMessage(msg, "⚠️ لم يتم العثور على الطالب", "error");
      } else {
        fill(result);
        showMessage(msg, '✅ تم جلب البيانات بنجاح', 'success');
      }
    } catch (error) {
      showMessage(msg, "⚠️ فشل الاتصال بالخادم.", "error");
    }
  });
  
  // تعديل بيانات طالب
  document.getElementById('editStud')?.addEventListener('click', async () => {
    const regNo = document.getElementById('regNo').value.trim();
    if (!regNo) return showMessage(msg, "⚠️ أدخل رقم التسجيل للتعديل", "error");
    
    showMessage(msg, "جاري تحديث البيانات...", "info");
    
    try {
      const result = await postToSheet(gather(), 'edit');
      if (result.error) {
        showMessage(msg, `⚠️ ${result.error}`, "error");
      } else {
        showMessage(msg, "✅ تم تحديث بيانات الطالب بنجاح", "success");
      }
    } catch (error) {
      showMessage(msg, "⚠️ حدث خطأ أثناء التحديث", "error");
    }
  });
});

// ✅ وظائف مساعدة
function showMessage(element, text, type) {
  if (!element) return;
  
  element.textContent = text;
  element.style.color = type === 'error' ? 'red' : 
                       type === 'success' ? 'green' : 
                       type === 'info' ? '#2196F3' : 'inherit';
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
}