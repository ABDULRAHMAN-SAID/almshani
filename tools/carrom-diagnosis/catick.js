function caTick(S2){
 const ps=S2.pcs;
 for(const p of ps){
  p.x+=p.vx;p.y+=p.vy;p.vx*=CA_FR;p.vy*=CA_FR;
  if(Math.abs(p.vx)<0.02)p.vx=0;if(Math.abs(p.vy)<0.02)p.vy=0;
  // الجدران
  if(p.x<p.r){p.x=p.r;p.vx=-p.vx*0.72}
  if(p.x>CA_R-p.r){p.x=CA_R-p.r;p.vx=-p.vx*0.72}
  if(p.y<p.r){p.y=p.r;p.vy=-p.vy*0.72}
  if(p.y>CA_R-p.r){p.y=CA_R-p.r;p.vy=-p.vy*0.72}
 }
 // اصطدامات مرنة بين الأقراص
 for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++){
  const a=ps[i],b=ps[j];
  let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),min=a.r+b.r;
  if(d===0){dx=0.01;d=0.01}
  if(d<min){
   const nx=dx/d,ny=dy/d,ov=(min-d)/2;
   a.x-=nx*ov;a.y-=ny*ov;b.x+=nx*ov;b.y+=ny*ov;
   const rvx=b.vx-a.vx,rvy=b.vy-a.vy,sep=rvx*nx+rvy*ny;
   if(sep<0){
    const m=a.r===CA_SR?1.5:1, m2=b.r===CA_SR?1.5:1;
    const imp=-(1.86)*sep/(1/m+1/m2);
    a.vx-=imp*nx/m;a.vy-=imp*ny/m;b.vx+=imp*nx/m2;b.vy+=imp*ny/m2;
   }
  }
 }
 // الجيوب الأربعة — القطعة تُسلَّم لحركة سقوط بدل أن تُمحى فورًا
 const P4=[[0,0],[CA_R,0],[0,CA_R],[CA_R,CA_R]];
 for(let i=ps.length-1;i>=0;i--){
  const p=ps[i];
  for(const[px,py]of P4){
   if(Math.hypot(p.x-px,p.y-py)<CA_POCK){
    S2.pot.push(p.t);
    (S2.drop||(S2.drop=[])).push({t:p.t,r:p.r,x:p.x,y:p.y,px,py,f:0});
    ps.splice(i,1);break;
   }
  }
 }
 if(S2.drop)for(const d of S2.drop)if(d.f<1)d.f=Math.min(1,d.f+0.021);
}