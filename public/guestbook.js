(() => {
const $ = selector => document.querySelector(selector);
const button=$('#guestSubmit'),feedback=$('#guestFeedback');
function notice(text,error=false){feedback.textContent=text;feedback.classList.toggle('guest-error',error)}
async function api(path,options){const response=await fetch(path,{credentials:'same-origin',cache:'no-store',...options});const data=await response.json();if(!response.ok)throw new Error(data.error||data.message||'请求失败');return data}
async function loadMessages(){
 const data=await api('/api/messages');button.disabled=!data.signedIn;
 $('#guestAuth').replaceChildren();
 if(data.signedIn){$('#guestAuth').textContent='已登录。昵称会公开显示，你的账号信息不会显示。'}else{const a=document.createElement('a');a.href='/signin-with-chatgpt?return_to='+encodeURIComponent('/#guestbook');a.target='_top';a.className='backend-auth';a.textContent='登录后发表留言';$('#guestAuth').append('阅读无需登录，',a,'。')}
 const list=$('#guestList');list.replaceChildren();
 if(!data.messages.length){list.textContent='还没有留言。成为第一个分享想法的人。';return}
 for(const m of data.messages){const item=document.createElement('article');item.className='guest-item';const meta=document.createElement('div');meta.className='guest-meta';const name=document.createElement('strong');name.textContent=m.name;const time=document.createElement('time');time.dateTime=new Date(m.created_at).toISOString();time.textContent=new Date(m.created_at).toLocaleString('zh-CN');meta.append(name,time);
 if(m.canDelete){const del=document.createElement('button');del.className='guest-delete';del.textContent='删除';del.type='button';del.onclick=async()=>{if(!confirm('删除这条留言？'))return;del.disabled=true;try{await api('/api/messages?id='+encodeURIComponent(m.id),{method:'DELETE'});await loadMessages();notice('留言已删除。')}catch(e){notice(e.message,true);del.disabled=false}};meta.append(del)}
 const body=document.createElement('p');body.textContent=m.body;item.append(meta,body);list.append(item)}
}
async function loadStatus(){const target=$('#backendStatus');try{const data=await api('/api/status');target.replaceChildren();const message=document.createElement('strong');message.textContent=data.message;const detail=document.createElement('time');detail.textContent='数据库已连接 · '+data.version+' · 服务器时间：'+new Date(data.serverTime).toLocaleString('zh-CN');target.append(message,detail)}catch(e){target.textContent=e.message}}
async function refresh(){const btn=$('#refreshBackend');btn.disabled=true;await Promise.all([loadStatus(),loadMessages().catch(e=>{$('#guestList').textContent=e.message;notice('加载失败，可点击刷新数据重试。',true)})]);btn.disabled=false}
$('#refreshBackend').onclick=refresh;
$('#guestForm').onsubmit=async e=>{e.preventDefault();button.disabled=true;notice('正在保存到服务器…');try{await api('/api/messages',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:$('#guestName').value,body:$('#guestBody').value})});$('#guestBody').value='';notice('已保存到数据库。刷新页面后仍可看到。');await loadMessages()}catch(e){notice(e.message,true)}finally{button.disabled=false}};
refresh();
})();
