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


app.post('/add-job', async (req, res) => {
    const { customer, jobType, dueTime } = req.body;
    const thailandTime = new Date(dueTime + ":00+06:00");
    const { error } = await supabase
        .from('jobs')
        .insert([
            {
                customer: customer,
                jobtype: jobType,   // ต้องเป็น jobType ตรงนี้
                duetime: thailandTime.toISOString(),
                status: "รอดำเนินการ",
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



app.post('/delete-job', async (req, res) => {
  const { id } = req.body;

  const { error } = await supabase
    .from('jobs')
    .delete()
    .eq('id', id);

  if (error) {
    console.log(error);
    return res.send("ลบไม่สำเร็จ");
  }

  res.redirect('/jobs');
});


//อัพเดทงาน
app.post('/update-job', async (req, res) => {
    const { id, customer, jobtype, duetime } = req.body;

    // 👉 เอาเวลาที่เลือกมา +6 ชั่วโมง
    const adjustedTime = new Date(duetime);
    adjustedTime.setHours(adjustedTime.getHours() - 0);

    const { error } = await supabase
        .from('jobs')
        .update({
            customer: customer,
            jobtype: jobtype,
            duetime: adjustedTime.toISOString(),
            notified: false
})
    .eq('id', id);

  if (error) {
    console.error(error);
    return res.send("แก้ไขไม่สำเร็จ");
  }

  res.redirect('/jobs');
});




// ดูงานทั้งหมด
app.get('/jobs', async (req, res) => {

    const { data: jobs, error } = await supabase
        .from('jobs')
        .select('*')
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
                <p>กำหนดส่ง: ${
  new Date(job.duetime).toLocaleDateString("th-TH", {
    timeZone: "Asia/Dhaka",
    day: "numeric",
    month: "short",
    year: "numeric",
  }) +
  " เวลา " +
  new Date(job.duetime).toLocaleTimeString("th-TH", {
    timeZone: "Asia/Dhaka",
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
  


            
<form method="POST" action="/delete-job" style="margin-top:10px;">

<a href="/edit/${job.id}" 
   style="display:inline-block;margin-top:8px;color:#38bdf8;">
   แก้ไขงาน
</a>

  <input type="hidden" name="id" value="${job.id}">
  <button style="background:#e74c3c;color:white;border:none;padding:6px 10px;border-radius:5px;cursor:pointer;">
    ลบงาน
  </button>
</form>



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
        ${jobCards || "<p>ยังไม่มีงาน</p>"}
        <br>
        <a href="/">⬅ กลับหน้าเพิ่มงาน</a>
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
const localTime = new Date(new Date(job.duetime).getTime() + 6 * 60 * 60 * 1000)
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

        วันเวลา:<br>
        <input type="datetime-local" 
               name="duetime" 
               value="${localTime}" />
        <br><br>

        <button type="submit">บันทึก</button>
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



app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>ดำรงค์อิงค์เจ็ท - Work Manager</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                background: #0f172a;
                color: white;
                display: flex;
                justify-content: center;
                padding: 40px;
            }
            .container {
                background: #1e293b;
                padding: 30px;
                border-radius: 15px;
                width: 400px;
                box-shadow: 0 0 20px rgba(0,0,0,0.5);
            }
            h1 {
                text-align: center;
                margin-bottom: 20px;
            }
            label {
                font-size: 14px;
            }
            input, select {
                width: 100%;
                padding: 8px;
                margin-top: 5px;
                margin-bottom: 15px;
                border-radius: 8px;
                border: none;
            }
            button {
                width: 100%;
                padding: 10px;
                border: none;
                border-radius: 10px;
                background: #2563eb;
                color: white;
                font-weight: bold;
                cursor: pointer;
            }
            button:hover {
                background: #1d4ed8;
            }
            a {
                color: #38bdf8;
                display: block;
                text-align: center;
                margin-top: 15px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>ดำรงค์อิงค์เจ็ท</h1>
            <form method="POST" action="/add-job">
                <label>ชื่อลูกค้า</label>
                <input name="customer" required />

                <label>ประเภทงาน</label>
                <select name="jobType">
                    <option>ไวนิล</option>
                    <option>กล่องไฟ</option>
                    <option>ตัวอักษร</option>
                    <option>สแตนดี้</option>
                    <option>สติ๊กเกอร์</option>
                    <option>ติดตั้ง</option>
                    <option>ฟิวเจอร์บอร์ด</option>
                    <option>ตรายาง</option>
                </select>

                <label>วันและเวลาส่งงาน</label>
                <input type="datetime-local" name="dueTime" required />

                <button type="submit">เพิ่มงาน</button>
            </form>
            <a href="/jobs">ดูงานทั้งหมด</a>
        </div>
    </body>
    </html>
    `);
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
    timeZone: "Asia/Dhaka",
    day: "numeric",
    month: "short",
    year: "numeric",
  }) +
  " เวลา " +
  due.toLocaleTimeString("th-TH", {
    timeZone: "Asia/Dhaka",
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
