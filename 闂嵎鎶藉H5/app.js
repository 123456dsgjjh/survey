const QUESTIONS = [
  {id:'q1',type:'radio',title:'1. 你目前的年级是？',options:['大一','大二','大三','大四/其他'],required:true},
  {id:'q2',type:'radio',title:'2. 你平时最常通过什么方式获取校园资讯？',options:['公众号/网页','同学群/社群','短视频平台','线下宣传','其他'],required:true},
  {id:'q3',type:'checkbox',title:'3. 你希望校园调查活动增加哪些内容？（可多选）',options:['校园生活','学习成长','就业/实习','文体活动','公益实践'],required:true},
  {id:'q4',type:'radio',title:'4. 你是否愿意参加类似的校园活动？',options:['愿意','看情况','暂时不愿意'],required:true},
  {id:'q5',type:'text',title:'5. 你对本次问卷有什么建议？',placeholder:'请输入你的建议（选填）',required:false}
];

const SB = window.supabase.createClient(APP_CONFIG.SUPABASE_URL, APP_CONFIG.SUPABASE_PUBLISHABLE_KEY);
const DEVICE_KEY='survey_raffle_device_id_v1';
let deviceId=localStorage.getItem(DEVICE_KEY);
if(!deviceId){deviceId=crypto.randomUUID();localStorage.setItem(DEVICE_KEY,deviceId)}
let drawResult=null;
let prizes=['小礼品A','小礼品B','小礼品C','谢谢参与'];
const form=document.getElementById('surveyForm');

function renderQuestions(){
  form.innerHTML=QUESTIONS.map((q,i)=>{
    const req=q.required?' <span aria-hidden="true">*</span>':'';
    if(q.type==='radio') return `<div class="question"><h3>${q.title}${req}</h3>${q.options.map(o=>`<label class="option"><input type="radio" name="${q.id}" value="${escapeHtml(o)}" ${q.required?'required':''}><span>${escapeHtml(o)}</span></label>`).join('')}</div>`;
    if(q.type==='checkbox') return `<div class="question"><h3>${q.title}${req}</h3>${q.options.map(o=>`<label class="option"><input type="checkbox" name="${q.id}" value="${escapeHtml(o)}"><span>${escapeHtml(o)}</span></label>`).join('')}<small class="muted" style="display:block">至少选择一项</small></div>`;
    return `<div class="question"><h3>${q.title}${req}</h3><textarea class="text-area" name="${q.id}" rows="4" placeholder="${escapeHtml(q.placeholder||'')}"></textarea></div>`;
  }).join('')+`<button class="primary big" type="submit">提交问卷并抽奖</button><p id="submitStatus" class="muted"></p>`;
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function collectAnswers(){
  const answers={};
  for(const q of QUESTIONS){
    if(q.type==='radio'){const x=form.querySelector(`input[name="${q.id}"]:checked`);answers[q.id]=x?x.value:'';}
    if(q.type==='checkbox'){answers[q.id]=[...form.querySelectorAll(`input[name="${q.id}"]:checked`)].map(x=>x.value)}
    if(q.type==='text'){answers[q.id]=(form.querySelector(`[name="${q.id}"]`)?.value||'').trim()}
  }
  return answers;
}
function validate(a){
  for(const q of QUESTIONS){if(!q.required)continue; if(q.type==='checkbox' && (!a[q.id]||a[q.id].length===0))return `${q.title} 请至少选择一项`; if(q.type!=='checkbox' && !a[q.id])return `${q.title} 请填写`}
  return '';
}
async function refreshStats(){
  const {data,error}=await SB.rpc('get_public_stats');
  if(!error && data) document.getElementById('participantCount').textContent=(data.participants??0).toLocaleString();
}
async function recordVisit(){try{await SB.rpc('record_visit',{p_device_id:deviceId})}catch(e){} refreshStats()}
function openModal(el){el.classList.remove('hidden');el.setAttribute('aria-hidden','false')}
function closeModal(el){el.classList.add('hidden');el.setAttribute('aria-hidden','true')}

form.addEventListener('submit',async(e)=>{
  e.preventDefault();
  const status=document.getElementById('submitStatus');
  const answers=collectAnswers(); const err=validate(answers);
  if(err){status.textContent=err;status.className='muted error';return}
  status.textContent='正在提交…';status.className='muted';
  const {data,error}=await SB.rpc('submit_survey',{p_device_id:deviceId,p_answers:answers});
  if(error){status.textContent=(error.message||'提交失败，请稍后重试');status.className='muted error';return}
  drawResult=data; status.textContent='提交成功';
  openModal(document.getElementById('wheelModal')); document.getElementById('spinButton').disabled=false;
  refreshStats();
});

document.getElementById('spinButton').addEventListener('click',async()=>{
  const btn=document.getElementById('spinButton'); const s=document.getElementById('spinStatus');
  btn.disabled=true;s.textContent='抽奖中，请稍候…';
  const {data,error}=await SB.rpc('draw_prize',{p_device_id:deviceId});
  if(error){btn.disabled=false;s.textContent=error.message||'抽奖失败，请重试';s.className='muted error';return}
  drawResult=data;
  if(Array.isArray(data.prize_names)&&data.prize_names.length) prizes=data.prize_names;
  const idx=Math.max(0,Number(data.wheel_index||0));
  const turns=5+Math.floor(Math.random()*2);
  const segment=360/Math.max(prizes.length,1);
  const desired=360-(idx*segment+segment/2);
  document.getElementById('wheel').style.transform=`rotate(${turns*360+desired}deg)`;
  setTimeout(()=>{closeModal(document.getElementById('wheelModal'));document.getElementById('prizeText').textContent=data.prize_name;document.getElementById('resultTip').textContent=data.is_thank_you?'谢谢参与，期待下次再见！':'恭喜你获得奖品，请填写收货信息。';document.getElementById('claimButton').style.display=data.is_thank_you?'none':'block';openModal(document.getElementById('resultModal'));},4300);
});

document.getElementById('claimButton').addEventListener('click',()=>{closeModal(document.getElementById('resultModal'));openModal(document.getElementById('shippingModal'))});
document.getElementById('closeWheel').addEventListener('click',()=>closeModal(document.getElementById('wheelModal')));
document.getElementById('closeShipping').addEventListener('click',()=>closeModal(document.getElementById('shippingModal')));

document.getElementById('shippingForm').addEventListener('submit',async(e)=>{
  e.preventDefault();const f=e.target;const status=document.getElementById('shippingStatus');
  const name=f.name.value.trim(),phone=f.phone.value.trim(),address=f.address.value.trim();
  if(!name||!phone||!address){status.textContent='请把信息填写完整';status.className='muted error';return}
  status.textContent='正在保存…';
  const {error}=await SB.rpc('save_shipping',{p_device_id:deviceId,p_name:name,p_phone:phone,p_address:address});
  if(error){status.textContent=error.message||'保存失败';status.className='muted error';return}
  status.textContent='已提交，我们会按登记信息安排寄送。';status.className='muted success';f.querySelector('button').disabled=true;
});

renderQuestions();recordVisit();
