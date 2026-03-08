require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

//เพิ่มงาน
app.post('/add-job', async (req, res) => {
    const { customer, jobType, dueTime, status, note, price, items} = req.body;


    console.log(req.body);

    // 🛑 เช็คก่อนว่า duetime มีค่าไหม
   if (!customer || !jobType || !dueTime) {
    return res.send("กรุณากรอกข้อมูลให้ครบ");
  }

  const parsedDate = new Date(dueTime);

  if (isNaN(parsedDate.getTime())) {
    return res.send("กรุณาเลือกวันเวลา");
  }

  const thailandTime = new Date(dueTime + ":00+07:00");


    const { error } = await supabase
        .from('jobs')
        .insert([
            {
                customer: customer,
                jobtype: jobType,   // ต้องเป็น jobType ตรงนี้
                duetime: thailandTime.toISOString(),
                status: "รอดำเนินการ",
                note: note || null,
                price: price || 0,
                items: items ? JSON.parse(items) : null,
                notified: false
                
            }
        ]);

    if (error) {
        console.error(error);
        return res.send("เกิดข้อผิดพลาด");
    }

    res.redirect('/jobs');
});


app.post('/update-status', async (req, res) => {
    const { id, status } = req.body;

    const { error } = await supabase
        .from('jobs')
        .update({ status: status })
        .eq('id', id);

    if (error) {
        console.error(error);
        return res.send("อัปเดตไม่สำเร็จ");
    }

    res.redirect('/jobs');
});


//ลบงาน
app.post('/delete-job', async (req, res) => {
  const { id } = req.body;

  const { error } = await supabase
    .from('jobs')
    .update({ 
        is_deleted: true,
        notified: true 
    })
.eq('id', id);

  if (error) {
    console.log(error);
    return res.send("ลบไม่สำเร็จ");
  }

  res.redirect('/jobs');
});


//อัพเดทงาน
app.post('/update-job', async (req, res) => {
    const { id, customer, jobtype, duetime, note } = req.body;

    // 👉 เอาเวลาที่เลือกมา +6 ชั่วโมง
    const adjustedTime = new Date(duetime);
    adjustedTime.setHours(adjustedTime.getHours() - 7);

    const { error } = await supabase
        .from('jobs')
        .update({
            customer: customer,
            jobtype: jobtype,
            duetime: adjustedTime.toISOString(),
            note: note || null,
            notified: false
})
    .eq('id', id);

  if (error) {
    console.error(error);
    return res.send("แก้ไขไม่สำเร็จ");
  }

  res.redirect('/jobs');
});


//หน้างานที่ลบ ประวัติ
app.get('/deleted', async (req, res) => {

    const { data: jobs, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('is_deleted', true)
        .order('duetime', { ascending: false });

    if (error) {
        console.error(error);
        return res.send("โหลดข้อมูลไม่สำเร็จ");
    }

    const jobCards = jobs.map(job => {

        const dueDate = new Date(job.duetime).toLocaleString('th-TH', {
            timeZone: 'Asia/Bangkok',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const createdDate = new Date(job.created_at).toLocaleString('th-TH', {
            timeZone: 'Asia/Bangkok',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        return `
            <div style="border:1px solid #ddd;padding:12px;margin-bottom:12px;border-radius:8px;">
                <strong>${job.customer}</strong><br>
                ประเภท: ${job.jobtype}<br>
                📅 กำหนดส่ง: ${dueDate}<br>
                🕒 วันที่ลบ: ${createdDate}<br>
                สถานะ: ${job.status}
            </div>
        `;
    }).join('');

    res.send(`
        <h2>งานที่ถูกลบ</h2>
        <a href="/jobs">← กลับหน้าหลัก</a>
        <br><br>
        ${jobCards || "ไม่มีข้อมูล"}
    `);
});



//หน้างานสำเร็จ
app.get('/completed', async (req, res) => {

    const { data: jobs, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('status', 'เสร็จแล้ว')
        .eq('is_deleted', false)
        .order('duetime', { ascending: false });

    if (error) {
        console.error(error);
        return res.send("โหลดข้อมูลไม่สำเร็จ");
    }

    const jobCards = jobs.map(job => {

        const dueDate = new Date(job.duetime).toLocaleString('th-TH', {
            timeZone: 'Asia/Bangkok',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const createdDate = new Date(job.created_at).toLocaleString('th-TH', {
            timeZone: 'Asia/Bangkok',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        return `
            <div style="border:1px solid #ddd;padding:12px;margin-bottom:12px;border-radius:8px;">
                <strong>${job.customer}</strong><br>
                ประเภท: ${job.jobtype}<br>
                📅 กำหนดส่ง: ${dueDate}<br>
                🕒 วันที่เสร็จ: ${createdDate}<br>
            </div>
        `;
    }).join('');

    res.send(`
        <h2>งานที่เสร็จแล้ว</h2>
        <a href="/jobs">← กลับหน้าหลัก</a>
        <br><br>
        ${jobCards || "ไม่มีข้อมูล"}
    `);
});


//หน้าสถานะงาน
/*app.get('/monitor', async (req, res) => {

    const { data: jobs, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('is_deleted', false)
        .order('duetime', { ascending: true });

    if (error) {
        console.error(error);
        return res.send("โหลดข้อมูลไม่สำเร็จ");
    }

    const now = new Date();
    const todayString = now.toDateString();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowString = tomorrow.toDateString();

    let installationUpcoming = [];
    let todayJobs = [];
    let tomorrowJobs = [];
    let pending = [];
    let working = [];
    let completed = [];

    jobs.forEach(job => {

        const due = new Date(job.duetime);
        const diffMinutes = (due - now) / 60000;
        const diffDays = Math.floor((due - now) / (1000 * 60 * 60 * 24));


        // วันนี้
        if (
    due.getFullYear() === now.getFullYear() &&
    due.getMonth() === now.getMonth() &&
    due.getDate() === now.getDate() &&
    job.status != "เสร็จแล้ว"
) {
    todayJobs.push({ job, diffMinutes });
}

        // พรุ่งนี้
        if (
    due.getFullYear() === tomorrow.getFullYear() &&
    due.getMonth() === tomorrow.getMonth() &&
    due.getDate() === tomorrow.getDate() &&
    job.status != "เสร็จแล้ว"
) {
    tomorrowJobs.push({ job, diffMinutes });
}

if (
  job.jobtype === "ติดตั้ง" &&
  job.status !== "เสร็จแล้ว" &&
  diffDays <= 2 && diffDays >= 0
) {
  installationUpcoming.push(job);
}
    
const installSection = `
<h2 style="margin-top:40px;">📦 งานติดตั้งใกล้ถึงกำหนด</h2>
${
  installationUpcoming.length === 0
  ? "<p style='opacity:0.6;'>ไม่มีงานติดตั้งใกล้ถึงกำหนด</p>"
  : installationUpcoming.map(job => {
      const dueText = new Date(job.duetime).toLocaleDateString("th-TH", {
        timeZone: "Asia/Bangkok",
        day: "numeric",
        month: "short",
        year: "numeric"
      });

      return `
      <div class="install-card">
        🔴 <strong>${job.customer}</strong>
        <span>${job.jobtype}</span>
        <span>📅 ${dueText}</span>
      </div>
      `;
    }).join("")
}
`;

        // แยกสถานะ
        if (job.status === "รอดำเนินการ") pending.push(job);
        else if (job.status === "กำลังทำ") working.push(job);
        else if (job.status && job.status.includes("เสร็จแล้ว")) completed.push(job);

        pending.sort((a,b)=> new Date(a.duetime) - new Date(b.duetime));
        working.sort((a,b)=> new Date(a.duetime) - new Date(b.duetime));
        completed.sort((a,b)=> new Date(a.duetime) - new Date(b.duetime));


    });

    const createRowCard = (job, diffMinutes = null) => {

    let bgColor = "#1f2937";
    let extraClass = "";
    let icon = "⚪";

    // 🔴 ใกล้กำหนด ≤ 30 นาที
    if (diffMinutes !== null && diffMinutes <= 30 && diffMinutes > 0) {
        bgColor = "#7f1d1d";
        extraClass = "blink-red";
        icon = "🔴";
    }

    // 🔵 กำลังทำ
    else if (job.status === "กำลังทำ") {
        bgColor = "#1e3a8a";
        extraClass = "blink-blue";
        icon = "🔵";
    }

    // 🟢 เสร็จ
    else if (job.status === "เสร็จสิ้น") {
        bgColor = "#064e3b";
        icon = "🟢";
    }

    // 🟡 รอดำเนินการ
    else {
        icon = "🟡";
    }

    return `
    <div class="row-card ${extraClass}" style="background:${bgColor}">
        <strong>${icon} ${job.customer}</strong>
        <span>${job.jobtype}</span>
        <span>${new Date(job.duetime).toLocaleTimeString('th-TH',{
            timeZone:'Asia/Bangkok',
            hour:'2-digit',
            minute:'2-digit'
        })}</span>
        <span>${job.status}</span>
    </div>
    `;
};



    const createStatusRowCard = (job) => {

    const now = new Date();
    const due = new Date(job.duetime);
    const diffMinutes = (due - now) / 60000;

    const dueText = due.toLocaleString('th-TH', {
        timeZone: 'Asia/Bangkok',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    let badge = "";
    let bgColor = "#1f2937";
    let icon = "🟡";




    // 🟣 เลยกำหนด
    if (diffMinutes < 0 && job.status !== "เสร็จสิ้น") {
        bgColor = "#ff6017ff";
        icon = "🟣";
    }

    // 🔵 กำลังทำ
    else if (job.status === "กำลังทำ") {
        bgColor = "#1e3a8a";
        icon = "🔵";
    }

    // 🟢 เสร็จ
    else if (job.status && job.status.includes("เสร็จ")) {
        bgColor = "#064e3b";
        icon = "🟢";
    }


    function toBKK(date) {
  return new Date(
    new Date(date).toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
  );
}

    // badge พรุ่งนี้
   const dueBKK = toBKK(job.duetime);
const nowBKK = toBKK(new Date());

const tomorrowBKK = new Date(nowBKK);
tomorrowBKK.setDate(nowBKK.getDate() + 1);

if (dueBKK.toDateString() === tomorrowBKK.toDateString()) {
  badge = `<span class="badge">พรุ่งนี้</span>`;
}


    return `
    <div class="row-card" style="background:${bgColor}">
        <strong>${icon} ${job.customer}</strong>
        <span>${job.jobtype}</span>
        <span>📅 ${dueText}</span>
        ${badge}
    </div>
    `;
};



    res.send(`
    <html>
    <head>
        <meta http-equiv="refresh" content="30">
        <style>
            body {
                font-family: sans-serif;
                background: #111827;
                color: white;
                margin: 0;
                padding: 20px;
            }
            h1, h2, h3 {
                margin-bottom: 10px;
            }
            .dashboard {
                display: flex;
                gap: 20px;
                margin-bottom: 30px;
            }
            .box {
                background: #1f2937;
                padding: 20px;
                border-radius: 10px;
                font-size: 22px;
                flex: 1;
                text-align: center;
            }
            .horizontal {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
                margin-bottom: 25px;
            }
            .row-card {
                display: flex;
                gap: 15px;
                align-items: center;
                padding: 10px 15px;
                border-radius: 8px;
                font-size: 16px;
            }
            .row {
                display: flex;
                gap: 20px;
                margin-top: 20px;
            }
            .column {
                flex: 1;
            }
            .card {
                background: #1f2937;
                padding: 10px;
                margin-bottom: 10px;
                border-radius: 8px;
            }

            #clock {
                position: fixed;
                top: 20px;
                right: 30px;
                font-size: 36px;
                font-weight: bold;
                color: #e5e7eb;
                letter-spacing: 2px;
            }

            .badge {
                background:#f59e0b;
                color:black;
                padding:3px 8px;
                border-radius:6px;
                font-size:12px;
                font-weight:bold;
            }

            .install-alert {
                background: #3a1a1a;
                border-left: 4px solid #ff4d4d;
            }
            
            .install-card {
                background: #2a1a1a;
                border-left: 5px solid #ff4d4d;
                padding: 10px 14px;
                border-radius: 8px;
                margin-bottom: 8px;
                display: flex;
                gap: 14px;
                align-items: center;
            }



            .blink-red {
    animation: blinkRed 0.6s infinite;
}

.blink-blue {
    animation: blinkBlue 1.2s infinite;
}

@keyframes blinkRed {
    50% { opacity: 0.3; }
}

@keyframes blinkBlue {
    50% { opacity: 0.5; }
}


        </style>
    </head>
    <body>
        <div id="clock"></div>
        <h1>📺 MONITOR ระบบงานร้านดำรงค์อิงค์เจ็ท ท่าใหม่</h1>

        <div class="dashboard">
            <div class="box">📅 วันนี้ ${todayJobs.length} งาน</div>
            <div class="box">📆 พรุ่งนี้ ${tomorrowJobs.length} งาน</div>
            <div class="box">🟡 รอดำเนินการ ${pending.length}</div>
            <div class="box">🔵 กำลังทำ ${working.length}</div>
            <div class="box">🟢 เสร็จแล้ว ${completed.length}</div>
        </div>

        <h2>
🔥 วันนี้ 
<span id="today-date" style="font-size:16px;color:#9ca3af;"></span>
</h2>

        <div class="horizontal">
        ${todayJobs.map(item => createRowCard(item.job, item.diffMinutes)).join('') || "ไม่มีงานวันนี้"}
        </div>

        <h2>
📆 พรุ่งนี้ 
<span id="tomorrow-date" style="font-size:16px;color:#9ca3af;"></span>
</h2>

        <div class="horizontal">
        ${tomorrowJobs.map(item => createRowCard(item.job, item.diffMinutes)).join('') || "ไม่มีงานพรุ่งนี้"}
        </div>



        
       <h2>📊 แยกตามสถานะ</h2>

<div class="row">
    <div class="column">
        <h3>รอดำเนินการ</h3>
        <div class="horizontal">
            ${pending.map(createStatusRowCard).join('') || "ไม่มีงาน"}
        </div>
    </div>

    <div class="column">
        <h3>กำลังทำ</h3>
        <div class="horizontal">
            ${working.map(createStatusRowCard).join('') || "ไม่มีงาน"}
        </div>
    </div>

    <div class="column">
        <h3>เสร็จสิ้น</h3>
        <div class="horizontal">
            ${completed.map(createStatusRowCard).join('') || "ไม่มีงาน"}
        </div>
    </div>
</div>


        <script>
function updateClock() {
    const now = new Date();

    const options = {
        timeZone: "Asia/Bangkok",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    };

    const timeString = now.toLocaleTimeString("th-TH", options);

    document.getElementById("clock").innerText = timeString;
}

setInterval(updateClock, 1000);
updateClock();
</script>

<script>
function updateDateLabels() {
    const now = new Date();

    const todayOptions = {
        timeZone: "Asia/Bangkok",
        day: "2-digit",
        month: "short"
    };

    const todayText = now.toLocaleDateString("th-TH", todayOptions);

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tomorrowText = tomorrow.toLocaleDateString("th-TH", todayOptions);

    document.getElementById("today-date").innerText = "(" + todayText + ")";
    document.getElementById("tomorrow-date").innerText = "(" + tomorrowText + ")";
}

updateDateLabels();
setInterval(updateDateLabels, 60000);
</script>




    </body>
    </html>
    `);
}); */
app.get('/monitor', async (req, res) => {

  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('is_deleted', false)
    .order('duetime', { ascending: true });

  if (error) return res.send("โหลดข้อมูลไม่สำเร็จ");

  const now = new Date();
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const isSameDate = (d1, d2) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  let todayJobs = [];
  let tomorrowJobs = [];
  let installJobs = [];
  let completedTodayTomorrow = [];

  let pending = 0;
  let working = 0;
  let completed = 0;
  let notFinishedTotal = 0;

  jobs.forEach(job => {
    const due = new Date(job.duetime);
    const diffMinutes = (due - now) / 60000;

    if (job.status !== "เสร็จแล้ว") notFinishedTotal++;

    if (job.status === "รอดำเนินการ") pending++;
    if (job.status === "กำลังทำ") working++;
    if (job.status === "เสร็จแล้ว") completed++;

    if (job.status !== "เสร็จแล้ว") {
      if (isSameDate(due, today)) todayJobs.push(job);
      if (isSameDate(due, tomorrow)) tomorrowJobs.push(job);
    }

    if (job.jobtype && job.jobtype.includes("ติดตั้ง") && job.status !== "เสร็จแล้ว") {
      installJobs.push(job);
    }

    if (
      job.status === "เสร็จแล้ว" &&
      (isSameDate(due, today) || isSameDate(due, tomorrow))
    ) {
      completedTodayTomorrow.push(job);
    }
  });

  function formatDateTime(dt) {
    return new Date(dt).toLocaleString("th-TH", {
      timeZone: "Asia/Bangkok",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function renderRow(job) {

    const due = new Date(job.duetime);
    const diffMinutes = (due - now) / 60000;

    let extraClass = "";
    let icon = "🟡";

    if (job.status === "กำลังทำ") {
      extraClass = "blue-blink";
      icon = "🔵";
    }

    if (diffMinutes <= 60 && diffMinutes > 0 && job.status !== "เสร็จแล้ว") {
      extraClass = "orange-blink";
    }

    if (diffMinutes <= 0 && job.status !== "เสร็จแล้ว") {
      extraClass = "red-blink";
    }

    return `
      <div class="row-card ${extraClass}">
        <strong>${icon} ${job.customer}</strong>
        <span>${job.jobtype}</span>
        <span>🗓 ${formatDateTime(job.duetime)}</span>
      </div>
    `;
  }

  res.send(`
  <html>
  <head>
  <meta http-equiv="refresh" content="30">
  <meta charset="UTF-8">
  <title>MONITOR</title>
  <style>
    body {
      margin:0;
      background:#0f172a;
      color:white;
      font-family:Arial;
      padding:20px;
    }

    h2 { margin-bottom:10px }

    .topbar {
      display:flex;
      justify-content:space-between;
      align-items:center;
    }

    .clock {
      font-size:40px;
      font-weight:bold;
    }

    .summary {
      display:grid;
      grid-template-columns:repeat(6,1fr);
      gap:10px;
      margin:20px 0;
    }

    .summary div {
      background:#1e293b;
      padding:15px;
      border-radius:10px;
      text-align:center;
      font-weight:bold;
    }

    .columns {
      display:grid;
      grid-template-columns:1fr 1fr 1fr;
      gap:20px;
    }

    .section {
      background:#1e293b;
      padding:15px;
      border-radius:10px;
    }

    .row-card {
      background:#334155;
      margin:8px 0;
      padding:10px;
      border-radius:8px;
      display:flex;
      justify-content:space-between;
      align-items:center;
    }

    .blue-blink {
      animation: blueblink 1s infinite;
    }
    @keyframes blueblink {
      50% { background:#2563eb; }
    }

    .orange-blink {
      animation: orangeblink 1s infinite;
    }
    @keyframes orangeblink {
      50% { background:#f97316; }
    }

    .red-blink {
      animation: redblink 1s infinite;
    }
    @keyframes redblink {
      50% { background:#dc2626; }
    }

    .completed-section {
      margin-top:30px;
      background:#14532d;
      padding:15px;
      border-radius:10px;
    }

    .legend {
        margin: 10px 0 20px 0;
        display:flex;
        gap:20px;
        font-size:14px;
        opacity:0.85;
    }

    .legend-item {
        padding:6px 10px;
        border-radius:6px;
    }

    .legend-item.blue {
        background:#1e3a8a;
    }

    .legend-item.orange {
        background:#7c2d12;
    }

    .legend-item.red {
        background:#7f1d1d;
    }


  </style>

  <script>
    function updateClock(){
      const now = new Date();
      document.getElementById("clock").innerText =
        now.toLocaleTimeString("th-TH", { hour12:false });
    }
    setInterval(updateClock,1000);
  </script>

  </head>
  <body onload="updateClock()">

    <div class="topbar">
      <h1>📺 MONITOR ระบบงานร้านดำรงค์อิงค์เจ็ท</h1>
      <div class="clock" id="clock"></div>
    </div>

    <div class="summary">
      <div>📅 วันนี้ ${todayJobs.length}</div>
      <div>📅 พรุ่งนี้ ${tomorrowJobs.length}</div>
      <div>🟡 รอดำเนินการ ${pending}</div>
      <div>🔵 กำลังทำ ${working}</div>
      <div>🟢 เสร็จแล้ว ${completed}</div>
      <div>📦 ยังไม่เสร็จ ${notFinishedTotal}</div>
    </div>

    <div class="legend">
        <span class="legend-item blue">🔵 กำลังทำ</span>
        <span class="legend-item orange">🟠 ใกล้ 1 ชม.</span>
        <span class="legend-item red">🔴 เลยกำหนด</span>
    </div>

    <div class="columns">

      <div class="section">
        <h2>🔥 วันนี้ (${today.toLocaleDateString("th-TH")})</h2>
        ${todayJobs.map(renderRow).join("") || "ไม่มีงานวันนี้"}
      </div>

      <div class="section">
        <h2>📅 พรุ่งนี้ (${tomorrow.toLocaleDateString("th-TH")})</h2>
        ${tomorrowJobs.map(renderRow).join("") || "ไม่มีงานพรุ่งนี้"}
      </div>

      <div class="section">
        <h2>🛠 งานติดตั้ง</h2>
        ${installJobs.map(renderRow).join("") || "ไม่มีงานติดตั้ง"}
      </div>

    </div>

    <div class="completed-section">
      <h2>✅ งานเสร็จวันนี้/พรุ่งนี้</h2>
      ${completedTodayTomorrow.map(renderRow).join("") || "ยังไม่มีงานเสร็จ"}
    </div>

  </body>
  </html>
  `);
});





// ดูงานทั้งหมด
/*app.get('/jobs', async (req, res) => {

    const { data: jobs, error } = await supabase
    
        .from('jobs')
.select('*')
.eq('is_deleted', false)
        .order('id', { ascending: false });

    if (error) {
        console.error(error);
        return res.send("ดึงข้อมูลไม่ได้");
    }

    let jobCards = jobs.map(job => {
        
        let statusColor = "#facc15";
        if (job.status === "กำลังทำ") statusColor = "#3b82f6";
        if (job.status === "เสร็จแล้ว") statusColor = "#22c55e";

        return `
            <div class="card">
                <h3>${job.customer}</h3>
                <p>ประเภท: ${job.jobtype}</p>
                ${job.note ? `
<p style="background:#1e293b;padding:6px 10px;border-radius:6px;color:#94a3b8;">
📝 ${job.note}
</p>
` : ``}

                <p>กำหนดส่ง: ${
  new Date(job.duetime).toLocaleDateString("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    year: "numeric",
  }) +
  " เวลา " +
  new Date(job.duetime).toLocaleTimeString("th-TH", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
  }) +
  " น."
}</p>
                <p style="color:${statusColor}; font-weight:bold;">
                    ${job.status}
                </p>
                <form method="POST" action="/update-status">
            <input type="hidden" name="id" value="${job.id}" />
             <select name="status">
             <option>รอดำเนินการ</option>
             <option>กำลังทำ</option>
             <option>เสร็จแล้ว</option>
            </select>
            <button type="submit">เปลี่ยนสถานะ</button>
            </form>
  


            


<a href="/edit/${job.id}" 
   <button style="background:#e74c3c;color:white;border:none;padding:6px 10px;border-radius:5px;cursor:pointer;">
   แก้ไขงาน
   </button>
</a>





            </div>
        `;
    }).join("");

    res.send(`
    <html>
    <head>
        <style>
            body { background:#0f172a; font-family:Arial; color:white; padding:30px; }
            .card { background:#1e293b; padding:20px; border-radius:15px; margin-bottom:15px; }
            a { color:#38bdf8; }
        </style>
    </head>
    <body>
        <h1>รายการงานทั้งหมด</h1> 
        <a href="/">⬅ กลับหน้าเพิ่มงาน</a> |
        <a href="/completed">งานเสร็จแล้ว</a> |
<a href="/deleted">งานที่ถูกลบ</a>
<br><br>

        ${jobCards || "<p>ยังไม่มีงาน</p>"}
        <br>
        
    </body>
    </html>
    `);
}); */ 
app.get('/jobs', async (req, res) => {

  const selectedDate = req.query.date || "";

  let query = supabase
    .from('jobs')
    .select('*')
    .eq('is_deleted', false)
    .neq('status', 'เสร็จแล้ว')
    .order('duetime', { ascending: true });

  // ===== กรองวันที่ (server-side) =====
  if (selectedDate) {
    const start = new Date(selectedDate);
    const end = new Date(selectedDate);
    end.setDate(end.getDate() + 1);

    query = query
      .gte('duetime', start.toISOString())
      .lt('duetime', end.toISOString());
  }

  const { data: jobs, error } = await query;
  if (error) return res.send("โหลดข้อมูลไม่สำเร็จ");

  const now = new Date();

  function isSameDate(d1, d2) {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  }

  function formatDateTime(dt) {
    return new Date(dt).toLocaleString("th-TH", {
      timeZone: "Asia/Bangkok",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  const todayJobs = jobs.filter(j =>
    isSameDate(new Date(j.duetime), now)
  );

  function renderRow(job) {
    return `
      <div class="job-row">
        <div class="job-left">
          <strong>${job.customer}</strong>
          <div class="sub">${job.jobtype}</div>
          <p>💰 ราคา: ${job.price ? job.price.toLocaleString() + " บาท" : "-"}</p>
          ${job.note ? `<div class="note">📝 ${job.note}</div>` : ""}
        </div>

        <div class="job-mid">
          🗓 ${formatDateTime(job.duetime)}
        </div>

        <div class="job-right">
          <form method="POST" action="/update-status">
            <input type="hidden" name="id" value="${job.id}">
            <select name="status" onchange="this.form.submit()">
              <option value="รอดำเนินการ" ${job.status === "รอดำเนินการ" ? "selected" : ""}>รอดำเนินการ</option>
              <option value="กำลังทำ" ${job.status === "กำลังทำ" ? "selected" : ""}>กำลังทำ</option>
              <option value="เสร็จแล้ว">เสร็จแล้ว</option>
            </select>
          </form>
        </div>
      </div>
    `;
  }

  res.send(`
  <html>
  <head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>งานทั้งหมด</title>

  <style>
    body{
      margin:0;
      background:#0f172a;
      color:white;
      font-family:Arial;
      padding:20px;
    }

    h1{margin-bottom:15px}

    .top-menu{
      display:grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap:10px;
      margin-bottom:20px;
    }

    .menu-btn{
      background:#1e293b;
      padding:14px;
      border-radius:10px;
      text-align:center;
      font-weight:bold;
      text-decoration:none;
      color:white;
      transition:0.2s;
    }

    .menu-btn:hover{
      background:#2563eb;
    }

    .filter-bar{
      display:flex;
      gap:10px;
      margin-bottom:15px;
      flex-wrap:wrap;
    }

    input[type="date"],
    input[type="text"]{
      padding:10px;
      border-radius:8px;
      border:none;
      font-size:14px;
    }

    input[type="text"]{
      flex:1;
      min-width:200px;
    }

    button{
      padding:8px 12px;
      border-radius:8px;
      border:none;
      background:#2563eb;
      color:white;
      cursor:pointer;
    }

    .columns{
      display:grid;
      grid-template-columns: 1fr 1.5fr;
      gap:20px;
    }

    .section{
      background:#1e293b;
      padding:15px;
      border-radius:10px;
    }

    .job-row{
      background:#334155;
      margin-bottom:8px;
      padding:10px;
      border-radius:8px;
      display:flex;
      justify-content:space-between;
      align-items:center;
      flex-wrap:wrap;
      gap:10px;
    }

    .job-left{flex:2}
    .job-mid{flex:1;font-size:13px;color:#cbd5e1}
    .job-right{flex:1;text-align:right}

    .sub{font-size:13px;color:#94a3b8}
    .note{font-size:13px;color:#facc15;margin-top:4px}

    @media(max-width:768px){
      .columns{grid-template-columns:1fr}
      .job-row{flex-direction:column;align-items:flex-start}
      .job-right{text-align:left}
    }

  </style>

  <script>
    function searchJobs(){
      let input = document.getElementById("search").value.toLowerCase();
      let rows = document.getElementsByClassName("job-row");

      for(let i=0;i<rows.length;i++){
        let text = rows[i].innerText.toLowerCase();
        rows[i].style.display = text.includes(input) ? "flex" : "none";
      }
    }
  </script>

  </head>

  <body>

    <h1>📋 งานทั้งหมด</h1>

    <div class="top-menu">
      <a class="menu-btn" href="/">➕ เพิ่มงาน</a>
      <a class="menu-btn" href="/completed">✅ งานเสร็จแล้ว</a>
      <a class="menu-btn" href="/deleted">🗑 งานที่ถูกลบ</a>
      <a class="menu-btn" href="/monitor">📺 มอนิเตอร์</a>
    </div>

    <div class="filter-bar">
      <form method="GET" action="/jobs">
        <input type="date" name="date" value="${selectedDate}">
        <button type="submit">กรองวันที่</button>
        <a href="/jobs" style="color:#94a3b8;margin-left:8px;">ล้าง</a>
      </form>

      <input type="text" id="search" onkeyup="searchJobs()" placeholder="🔎 ค้นหาลูกค้า / ประเภท / หมายเหตุ">
    </div>

    <div class="columns">

      <div class="section">
        <h2>🔥 งานวันนี้</h2>
        ${todayJobs.map(renderRow).join("") || "ไม่มีงานวันนี้"}
      </div>

      <div class="section">
        <h2>📋 งานทั้งหมดที่ยังไม่เสร็จ</h2>
        ${jobs.map(renderRow).join("") || "ไม่มีงานค้าง"}
      </div>

    </div>

  </body>
  </html>
  `);
});




//แสดงหน้าแก้ไข
app.get('/edit/:id', async (req, res) => {
  const { data: job, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (error) return res.send("ไม่พบข้อมูล");
const localTime = new Date(new Date(job.duetime).getTime() + 7 * 60 * 60 * 1000)
  .toISOString()
  .slice(0,16);

  res.send(`
    <html>
    <body style="background:#0f172a;color:white;font-family:Arial;padding:30px;">
      <h2>แก้ไขงาน</h2>
      <form method="POST" action="/update-job">
        <input type="hidden" name="id" value="${job.id}" />

        ชื่อลูกค้า:<br>
        <input name="customer" value="${job.customer}" /><br><br>

        ประเภทงาน:<br>
        <input name="jobtype" value="${job.jobtype}" /><br><br>

        รายละเอียดเพิ่มเติม:<br>
        <textarea name="note" rows="3" style="width:100%;">${job.note || ""}</textarea>
        <br><br>

        วันเวลา:<br>
        <input type="datetime-local" 
               name="duetime" 
               value="${localTime}" />
        <br><br>

        <style>
.btn-save {
    background:#2563eb;
    color:white;
    padding:8px 16px;
    border:none;
    border-radius:6px;
    cursor:pointer;
}

.btn-cancel {
    background:#6b7280;
    color:white;
    padding:8px 16px;
    border:none;
    border-radius:6px;
    cursor:pointer;
    margin-left:10px;
}
</style>

<button type="submit" class="btn-save">บันทึก</button>
<button type="button" 
        class="btn-cancel"
        onclick="window.location.href='/jobs'">
    ยกเลิก
</button>
</form>

<form method="POST" action="/delete-job" 
      onsubmit="return confirm('คุณแน่ใจหรือไม่ว่าต้องการลบงานนี้?');"
      style="display:inline;">
      
    <input type="hidden" name="id" value="${job.id}" />
    
    <button type="submit" 
            style="background:#dc2626;color:white;
                   padding:8px 16px;
                   border:none;border-radius:6px;
                   cursor:pointer;margin-left:10px;">
        ลบงาน
    </button>
</form>


    </body>
    </html>
  `);
});



const LINE_ACCESS_TOKEN = process.env.LINE_ACCESS_TOKEN;
const LINE_USER_ID = process.env.LINE_USER_ID;

async function sendLineMessage(message) {
    try {
        await axios.post(
            'https://api.line.me/v2/bot/message/push',
            {
                to: LINE_USER_ID,
                messages: [
                    {
                        type: 'text',
                        text: message
                    }
                ]
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${LINE_ACCESS_TOKEN}`
                }
            }
        );
        console.log('ส่งข้อความสำเร็จ');
    } catch (error) {
        console.error('ส่งข้อความไม่สำเร็จ', error.response?.data || error.message);
    }
}

app.get('/test', async (req, res) => {
    await sendLineMessage('ทดสอบแจ้งเตือนจากระบบ ดำรงค์อิงค์เจ็ท 🚀');
    res.send('ส่งข้อความทดสอบแล้ว');
});


//ปรับแต่งหน้าเพิ่มงาน
app.get('/', (req, res) => {
    res.send(`
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>เพิ่มงาน | ดำรงค์อิงค์เจ็ท</title>

<style>
body{
  background:#0f172a;
  font-family:Arial;
  color:white;
  margin:0;
}

.header{
  background:#111827;
  padding:18px;
  text-align:center;
  font-size:20px;
  font-weight:bold;
  border-bottom:1px solid #1f2937;
}

.form-container{
  max-width:500px;
  margin:auto;
  padding:20px;
}

h2{
  text-align:center;
  margin-bottom:25px;
}

label{
  font-size:14px;
  opacity:0.8;
}

input, select, textarea{
  width:100%;
  padding:14px;
  font-size:16px;
  border-radius:8px;
  border:none;
  margin-bottom:15px;
}

textarea{
  resize:vertical;
}

button{
  width:100%;
  padding:16px;
  font-size:18px;
  border-radius:10px;
  border:none;
  cursor:pointer;
  margin-top:8px;
}

.primary{
  background:#3b82f6;
  color:white;
}

.secondary{
  background:#1f2937;
  color:#38bdf8;
  font-size:15px;
}

.quick-btn{
  background:#1e293b;
  color:#38bdf8;
  font-size:14px;
  padding:10px;
}
</style>
</head>

<body>

<div class="header">
🏪 ดำรงค์อิงค์เจ็ท
</div>

<div class="form-container">
<h2>➕ เพิ่มงานใหม่</h2>

<form method="POST" action="/add-job">

<label>ชื่อลูกค้า</label>
<input name="customer" placeholder="เช่น คุณสมชาย" required autofocus />

<label>ประเภทงาน</label>
<select name="jobType" required>
  <option value="">-- เลือกประเภทงาน --</option>
  <option>ไวนิล</option>
  <option>สติ๊กเกอร์</option>
  <option>ป้ายโฟม</option>
  <option>สแตนดี้</option>
  <option>ติดตั้ง</option>
  <option>อื่นๆ</option>
</select>

<hr>

<label>รายละเอียดเพิ่มเติม</label>
<textarea name="note" rows="3" placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"></textarea>

<hr>
<h3>💰 รายการสินค้า</h3>

<div id="itemsContainer"></div>

<button type="button" onclick="addItem()">➕ เพิ่มรายการ</button>

<h3>รวมทั้งหมด: <span id="grandTotal">0</span> บาท</h3>

<input type="hidden" name="items" id="itemsInput">
<input type="hidden" name="price" id="finalPrice">


<label>กำหนดวันเวลา</label>
<input type="datetime-local" name="dueTime" required />

<button type="button" class="quick-btn" onclick="setOneHour()">⏰ ด่วน +1 ชั่วโมง</button>
<button type="button" class="quick-btn" onclick="setTomorrow()">📆 พรุ่งนี้ 10:00</button>

<button type="submit" class="primary">💾 บันทึกงาน</button>
<button type="button" class="secondary" onclick="window.location.href='/jobs'">
📋 ดูงานทั้งหมด
</button>

</form>
</div>

<script>

document.addEventListener("DOMContentLoaded", function(){

const container = document.getElementById("itemsContainer");
const grandTotalEl = document.getElementById("grandTotal");
const itemsInput = document.getElementById("itemsInput");
const finalPriceInput = document.getElementById("finalPrice");

let items = [];

/* =========================
   CONFIG ราคา
========================= */

const JOB_CONFIG = {

  "ไวนิล": { rate:180 },

  "ฟิวเจอร์บอร์ดพิมพ์":{
    rate:550,
    options:{
      diecut:100,
      laminate:40
    }
  },

  "สติ๊กเกอร์พิมพ์":{ rate:400 },

  "ฉลากสินค้า":{ rate:350 },

  "โฟมบอร์ดพิมพ์":{
    rate:600,
    options:{
      diecut:80
    }
  },

  "พลาสวูดพิมพ์":{
    thickness:{
      "3":{rate:850,diecut:120},
      "5":{rate:1100,diecut:150},
      "10":{rate:1500,diecut:200}
    },
    laminate:40
  }

};

/* =========================
   POPUP เลือกประเภท
========================= */

window.addItem = function(){

  const popup = document.createElement("div");
  popup.style.position="fixed";
  popup.style.top="0";
  popup.style.left="0";
  popup.style.right="0";
  popup.style.bottom="0";
  popup.style.background="rgba(0,0,0,0.6)";
  popup.style.display="flex";
  popup.style.alignItems="center";
  popup.style.justifyContent="center";
  popup.style.zIndex="999";

  const box = document.createElement("div");
  box.style.background="#111827";
  box.style.padding="20px";
  box.style.borderRadius="10px";
  box.style.width="280px";

  const title = document.createElement("div");
  title.textContent="เลือกประเภทสินค้า";
  title.style.marginBottom="10px";

  box.appendChild(title);

  Object.keys(JOB_CONFIG).forEach(type=>{

    const btn = document.createElement("button");
    btn.textContent = type;
    btn.style.width="100%";
    btn.style.margin="6px 0";
    btn.style.padding="10px";

    btn.onclick=()=>{
      document.body.removeChild(popup);
      createItem(type);
    };

    box.appendChild(btn);

  });

  popup.appendChild(box);
  document.body.appendChild(popup);

};

/* =========================
   CREATE ITEM
========================= */

function createItem(type){

  const item={
    type:type,
    width:"",
    height:"",
    unit:"cm",
    qty:1,
    options:{},
    thickness:null,
    total:0
  };

  items.push(item);
  render();

}

/* =========================
   คำนวณราคา
========================= */

function calculate(item){

  let w=parseFloat(item.width)||0;
  let h=parseFloat(item.height)||0;

  if(item.unit==="cm"){
    w=w/100;
    h=h/100;
  }

  const area=w*h;
  const qty=parseFloat(item.qty)||1;

  let rate=0;
  let optionCost=0;

  const config=JOB_CONFIG[item.type];

  if(item.type==="พลาสวูดพิมพ์"){

    if(!item.thickness)return 0;

    const th=config.thickness[item.thickness];
    rate=th.rate;

    if(item.options.diecut)
      optionCost+=th.diecut;

    if(item.options.laminate)
      optionCost+=area*config.laminate;

  }else{

    rate=config.rate;

    if(config.options){

      if(item.options.diecut)
        optionCost+=config.options.diecut;

      if(item.options.laminate)
        optionCost+=area*config.options.laminate;

    }

  }

  const base=area*rate*qty;

  return roundPrice(base+optionCost);

}

/* =========================
   ปัดเศษราคา
========================= */

function roundPrice(price){

  const last=price%10;

  if(last<=4.9)
    return price-last;
  else
    return price+(10-last);

}

/* =========================
   INPUT FIELD
========================= */

function inputField(label,value,cb){

  const wrap=document.createElement("div");
  wrap.style.marginBottom="8px";

  const l=document.createElement("div");
  l.textContent=label;
  l.style.fontSize="13px";
  l.style.opacity="0.8";

  const input=document.createElement("input");
  input.type="number";
  input.value=value||"";

  input.oninput=e=>{
    cb(e.target.value);
  };

  wrap.appendChild(l);
  wrap.appendChild(input);

  return wrap;

}

/* =========================
   RENDER
========================= */

function render(){

  container.innerHTML="";

  let grand=0;

  items.forEach((item,index)=>{

    const div=document.createElement("div");
    div.style.background="#1e293b";
    div.style.padding="12px";
    div.style.margin="12px 0";
    div.style.borderRadius="10px";

    const title=document.createElement("div");
    title.textContent=item.type;
    title.style.fontWeight="bold";
    title.style.marginBottom="6px";

    div.appendChild(title);

    div.appendChild(
      inputField("กว้าง",item.width,v=>{
        item.width=v;
        update();
      })
    );

    div.appendChild(
      inputField("สูง",item.height,v=>{
        item.height=v;
        update();
      })
    );

    div.appendChild(
      inputField("จำนวน",item.qty,v=>{
        item.qty=v;
        update();
      })
    );

    if(item.type==="พลาสวูดพิมพ์"){

      const select=document.createElement("select");

      ["3","5","10"].forEach(t=>{
        const op=document.createElement("option");
        op.value=t;
        op.textContent=t+" mm";
        select.appendChild(op);
      });

      select.onchange=e=>{
        item.thickness=e.target.value;
        update();
      };

      div.appendChild(select);

    }

    const config=JOB_CONFIG[item.type];

    if(config.options || item.type==="พลาสวูดพิมพ์"){

      const die=document.createElement("input");
      die.type="checkbox";

      die.onchange=e=>{
        item.options.diecut=e.target.checked;
        update();
      };

      div.appendChild(document.createTextNode(" ไดคัท"));
      div.appendChild(die);

      div.appendChild(document.createElement("br"));

      const lam=document.createElement("input");
      lam.type="checkbox";

      lam.onchange=e=>{
        item.options.laminate=e.target.checked;
        update();
      };

      div.appendChild(document.createTextNode(" เคลือบ"));
      div.appendChild(lam);

    }

    const total=document.createElement("div");
    total.style.marginTop="6px";

    item.totalEl=total;

    div.appendChild(total);

    const del=document.createElement("button");
    del.textContent="ลบรายการ";

    del.onclick=()=>{
      items.splice(index,1);
      render();
    };

    div.appendChild(del);

    container.appendChild(div);

  });

  update();

}

/* =========================
   UPDATE TOTAL
========================= */

function update(){

  let grand=0;

  items.forEach(item=>{

    item.total=calculate(item);
    grand+=item.total;

    if(item.totalEl)
      item.totalEl.textContent="รวม: "+item.total+" บาท";

  });

  grandTotalEl.textContent=grand;
  itemsInput.value=JSON.stringify(items);
  finalPriceInput.value=grand;

}

});
</script>

</body>
</html>
`)


});

const cron = require('node-cron');

/*cron.schedule('* * * * *', async () => {
    const now = new Date();

    const { data: jobs, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('notified', false);

    if (error) {
        console.error(error);
        return;
    }

    for (let job of jobs) {
        const due = new Date(job.duetime);
        const diffMinutes = (due - now) / 60000;

        if (diffMinutes <= 60 && diffMinutes > 59) {

            await sendLineMessage(
                `🔔 เตือนงาน\nลูกค้า: ${job.customer}\nประเภท: ${job.jobtype}\nเวลา: ${due.toLocaleString()}`
            );

            await supabase
                .from('jobs')
                .update({ notified: true })
                .eq('id', job.id);
        }
    }
});*/

//แจ้งเตือน
app.get('/api/check-reminder', async (req, res) => {

  const now = new Date();

  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('notified', false);

  if (error) {
    console.error(error);
    return res.send("error");
  }

  for (let job of jobs) {
    const due = new Date(job.duetime);
    const diffMinutes = (due - now) / 60000;

    if (diffMinutes <= 60 && diffMinutes >= 55) {

      await sendLineMessage(
        `🔔 เตือนงาน\nลูกค้า: ${job.customer}\nประเภท: ${job.jobtype}\nวันที่: ${
  due.toLocaleDateString("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    year: "numeric",
  }) +
  " เวลา " +
  due.toLocaleTimeString("th-TH", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
  }) +
  " น."
}`
      );

      await supabase
        .from('jobs')
        .update({ notified: true })
        .eq('id', job.id);
    }
  }

  res.send("checked");
});

app.listen(3000, () => {
    console.log('Server running at http://localhost:3000');
});
