(function(){
  const TOKEN_KEY='dwk-life-os-v3-token';
  let token=sessionStorage.getItem(TOKEN_KEY)||'';
  let authResolve;
  const authReady=new Promise(resolve=>authResolve=resolve);
  async function request(path,options={}){
    const headers={'Content-Type':'application/json',...(options.headers||{})};
    if(token)headers.Authorization='Bearer '+token;
    const response=await fetch('/api'+path,{...options,headers});
    if(!response.ok){
      let detail={};try{detail=await response.json()}catch{}
      if(response.status===401||response.status===403){
        if(path==='/auth/login')throw new Error(detail.message||'用户名或密码错误');
        showLogin();throw new Error('登录已失效，请重新登录');
      }
      throw new Error(detail.message||`请求失败（${response.status}）`);
    }
    return response.status===204?null:response.json();
  }
  function showLogin(message=''){
    document.getElementById('loginGate').hidden=false;
    document.querySelector('.app-shell').classList.add('auth-locked');
    document.getElementById('loginError').textContent=message;
  }
  function hideLogin(){document.getElementById('loginGate').hidden=true;document.querySelector('.app-shell').classList.remove('auth-locked')}
  async function check(){
    if(!token){showLogin();return}
    try{await request('/auth/me');hideLogin();authResolve()}catch{token='';sessionStorage.removeItem(TOKEN_KEY);showLogin()}
  }
  document.getElementById('loginForm').addEventListener('submit',async event=>{
    event.preventDefault();const submit=event.target.querySelector('button');submit.disabled=true;
    try{const values=Object.fromEntries(new FormData(event.target));const result=await request('/auth/login',{method:'POST',body:JSON.stringify(values)});token=result.token;sessionStorage.setItem(TOKEN_KEY,token);hideLogin();authResolve()}
    catch(error){showLogin(error.message)}finally{submit.disabled=false}
  });
  window.DWK_API={get:path=>request(path),post:(path,data)=>request(path,{method:'POST',body:JSON.stringify(data||{})}),put:(path,data)=>request(path,{method:'PUT',body:JSON.stringify(data)}),delete:path=>request(path,{method:'DELETE'}),ensureAuthenticated:async()=>{await check();return authReady},logout(){token='';sessionStorage.removeItem(TOKEN_KEY);location.reload()}};
})();
