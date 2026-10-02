const h=s=>[1,3,5].map(i=>parseInt(s.slice(i,i+2),16));
const lin=c=>{c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4)};
const L=rgb=>0.2126*lin(rgb[0])+0.7152*lin(rgb[1])+0.0722*lin(rgb[2]);
const mix=(fg,bg,a)=>fg.map((v,i)=>v*a+bg[i]*(1-a));
const cr=(a,b)=>{const x=L(a),y=L(b);return ((Math.max(x,y)+.05)/(Math.min(x,y)+.05))};
const T={bg:'#0A0B0C',bg2:'#111213',bg3:'#16181a',acid:'#C4F542',ink:'#ECEAE3',dim:'#9A9690',faint:'#5A5751',line:'#1F1F1F',ls:'#2a2a2a',warm:'#E07856',mail:'#9a9a94',black:'#000000'};
const rows=[
['body ink on page bg','ink','bg',4.5],['body ink on card bg2','ink','bg2',4.5],['ink on input bg3 (typed text / OTP digits)','ink','bg3',4.5],
['ink-dim helper on card bg2','dim','bg2',4.5],['ink-dim on page bg (footer/other)','dim','bg',4.5],['ink-dim on bg3 (readback panel/hover row)','dim','bg3',4.5],
['ink-faint 12px mono label on card bg2','faint','bg2',4.5],['ink-faint label on page bg (Retour au site in footer)','faint','bg',4.5],['ink-faint "Retour au site" in card on bg2','faint','bg2',4.5],
['ink-faint placeholder on input bg3','faint','bg3',4.5],['ink-faint table th on bg2','faint','bg2',4.5],['ink-faint label hover row bg3 (mobile td label)','faint','bg3',4.5],
['ink-faint disabled nav item on header bg2','faint','bg2',4.5],['"Bientot" tag 10px ink-dim on bg2','dim','bg2',4.5],
['warm error on card bg2','warm','bg2',4.5],['warm error on bg (confirm? readback)','warm','bg',4.5],['warm on bg3','warm','bg3',4.5],
['primary button #000 on acid','black','acid',4.5],['acid focus ring vs card bg2 (3:1)','acid','bg2',3],['acid focus ring vs page bg (3:1)','acid','bg',3],['acid ring vs input bg3','acid','bg3',3],
['input border line-strong vs card bg2 (3:1 UI)','ls','bg2',3],['input border line-strong vs input fill bg3','ls','bg3',3],['input fill bg3 vs card bg2 (3:1)','bg3','bg2',3],['card border --line vs page bg','line','bg',3],['ghost btn border line-strong vs header bg2','ls','bg2',3],
['OTP focus-within cell border ink-dim vs bg3','dim','bg3',3],['acid current-page underline vs header bg2','acid','bg2',3],
['EMAIL code digits #C4F542 on #0A0B0C','acid','bg',4.5],['EMAIL body #ECEAE3 on #111213','ink','bg2',4.5],['EMAIL security line #9a9a94 13px on #111213','mail','bg2',4.5],
['EMAIL invite paragraph #9A9690 on #111213','dim','bg2',4.5],['EMAIL invite footnote #5A5751 14px on #111213','faint','bg2',4.5],['EMAIL CTA #000 on #C4F542','black','acid',4.5],['EMAIL link #ECEAE3 on #111213','ink','bg2',4.5],['EMAIL code box border #2a2a2a vs #0A0B0C (decor)','ls','bg',3],
];
for(const [n,f,b,t] of rows){const r=cr(h(T[f]),h(T[b]));console.log(r.toFixed(2).padStart(6),r>=t?'PASS':'FAIL','(>='+t+')',n)}
// disabled/opacity .5 cases
const dis=(fg,bg)=>cr(mix(h(T[fg]),h(T[bg]),.5),h(T[bg]));
console.log(dis('dim','bg2').toFixed(2),'disabled btn-text (ink-dim @50%) on bg2');
const pb=mix(h(T.acid),h(T.bg2),.5);console.log(cr(mix(h(T.black),h(T.bg2),.5),pb).toFixed(2),'disabled primary: text vs its own blended bg');
console.log(cr(pb,h(T.bg2)).toFixed(2),'disabled primary bg vs card');
