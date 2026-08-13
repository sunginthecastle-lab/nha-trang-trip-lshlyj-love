const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const USER_ID = "이예지";
const PASSWORD = process.env.TRIP_PASSWORD || "멍청이";
const DB = path.join(__dirname, "data.json");

const initial = {
  prep: [
    "여권","항공권 확인","호텔 예약 확인","여행자보험","휴대폰 충전기",
    "보조배터리","멀티 어댑터","선크림","수영복","래쉬가드","슬리퍼","세면용품","상비약"
  ].map(t=>({t,d:0})),
  shop: [
    {t:"베트남 커피",p:15000,d:0},
    {t:"코코넛 과자",p:5000,d:0},
    {t:"기념 술",p:30000,d:0}
  ],
  gifts: [],
  money: []
};

if (!fs.existsSync(DB)) fs.writeFileSync(DB, JSON.stringify(initial,null,2));
function readDB(){ try{return JSON.parse(fs.readFileSync(DB,"utf8"))}catch{return initial} }
function writeDB(d){fs.writeFileSync(DB,JSON.stringify(d,null,2))}

const sessions = new Set();
function cookie(req){return (req.headers.cookie||"").match(/sid=([^;]+)/)?.[1]}
function logged(req){return sessions.has(cookie(req))}
function send(res,status,type,body,headers={}){res.writeHead(status,{"Content-Type":type,...headers});res.end(body)}
function json(res,status,obj){send(res,status,"application/json; charset=utf-8",JSON.stringify(obj))}
function body(req){return new Promise((resolve,reject)=>{let b="";req.on("data",c=>b+=c);req.on("end",()=>{try{resolve(JSON.parse(b||"{}"))}catch(e){reject(e)}})})}

const html = fs.readFileSync(path.join(__dirname,"index.html"),"utf8");

http.createServer(async (req,res)=>{
  if(req.url==="/login" && req.method==="POST"){
    try{
      const b=await body(req);
      if(b.id===USER_ID && b.password===PASSWORD){
        const sid=crypto.randomBytes(24).toString("hex"); sessions.add(sid);
        return json(res,200,{ok:true},{ "Set-Cookie":`sid=${sid}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800`});
      }
      return json(res,401,{ok:false,message:"아이디 또는 비밀번호가 맞지 않습니다."});
    }catch{return json(res,400,{ok:false})}
  }
  if(req.url==="/logout"){
    const sid=cookie(req); sessions.delete(sid); return json(res,200,{ok:true},{ "Set-Cookie":"sid=; Max-Age=0; Path=/"});
  }
  if(req.url==="/api/state"){
    if(!logged(req)) return json(res,401,{ok:false});
    return json(res,200,readDB());
  }
  if(req.url==="/api/state" && req.method==="POST"){
    if(!logged(req)) return json(res,401,{ok:false});
  }
  if(req.url==="/api/state" && req.method==="PUT"){
    if(!logged(req)) return json(res,401,{ok:false});
    try{const b=await body(req);writeDB(b);return json(res,200,{ok:true})}catch{return json(res,400,{ok:false})}
  }
  if(req.method==="GET" && (req.url==="/" || req.url==="/index.html")){
    return send(res,200,"text/html; charset=utf-8",html);
  }
  return send(res,404,"text/plain; charset=utf-8","Not Found");
}).listen(PORT,"0.0.0.0",()=>console.log(`Nha Trang Trip server: http://0.0.0.0:${PORT}`));
