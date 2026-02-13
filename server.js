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
    const { customer, jobType, dueTime, status, note } = req.body;
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
app.get('/monitor', async (req, res) => {

    const { data: jobs, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('is_deleted', false)
        .order('dueTime', { ascending: true });

    if (error) {
        console.error(error);
        return res.send("โหลดข้อมูลไม่สำเร็จ");
    }

    const now = new Date();

// วันนี้
const today = new Date(
  now.getFullYear(),
  now.getMonth(),
  now.getDate()
);

// พรุ่งนี้
const tomorrow = new Date(
  now.getFullYear(),
  now.getMonth(),
  now.getDate() + 1
);


    let todayJobs = [];
    let tomorrowJobs = [];
    let pending = [];
    let working = [];
    let completed = [];

    jobs.forEach(job => {
  const due = new Date(job.dueTime);

  const dueDateOnly = new Date(
    due.getFullYear(),
    due.getMonth(),
    due.getDate()
  );

  // 🔥 วันนี้
  if (
    dueDateOnly.getTime() === today.getTime() &&
    job.status !== "เสร็จแล้ว"
  ) {
    todayJobs.push(job);
  }

  // 🔥 พรุ่งนี้
  if (
    dueDateOnly.getTime() === tomorrow.getTime() &&
    job.status !== "เสร็จแล้ว"
  ) {
    tomorrowJobs.push(job);
  }


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
});





// ดูงานทั้งหมด
app.get('/jobs', async (req, res) => {

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

<label>รายละเอียดเพิ่มเติม</label>
<textarea name="note" rows="3" placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"></textarea>

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
function formatLocal(date) {
  if (!date || isNaN(date.getTime())) return "";

  const pad = (n) => n.toString().padStart(2, '0');

  return date.getFullYear() + "-" +
         pad(date.getMonth()+1) + "-" +
         pad(date.getDate()) + "T" +
         pad(date.getHours()) + ":" +
         pad(date.getMinutes());
}

function setOneHour(){
  let now = new Date();
  now.setHours(now.getHours() + 1);
  document.querySelector('[name="dueTime"]').value =
    formatLocal(now);
}

function setTomorrow(){
  let t = new Date();
  t.setDate(t.getDate()+1);
  t.setHours(10);
  t.setMinutes(0);
  document.querySelector('[name="dueTime"]').value =
    formatLocal(t);
}
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
