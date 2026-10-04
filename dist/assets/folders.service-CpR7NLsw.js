import{c as d,H as l,M as u,af as m,G as y,J as h,K as n,ag as D,ah as g,ai as p,aj as A,ak as k,al as c}from"./index-ZB1BDg9d.js";/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const F=d("EllipsisVertical",[["circle",{cx:"12",cy:"12",r:"1",key:"41hilf"}],["circle",{cx:"12",cy:"5",r:"1",key:"gxeob9"}],["circle",{cx:"12",cy:"19",r:"1",key:"lyex9k"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const I=d("Pencil",[["path",{d:"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",key:"1a8usu"}],["path",{d:"m15 5 4 4",key:"1mk7zo"}]]);function i(a){return a instanceof k?a.toDate():a instanceof Date?a:new Date}function f(a,e){return{id:a,uid:e.uid??"",name:e.name??"",parentId:e.parentId,category:e.category,createdAt:i(e.createdAt),updatedAt:i(e.updatedAt),fileCount:e.fileCount??0}}function o(a){return h(n,"users",a,"folders")}async function b(a,e,r,t){return{id:(await D(o(a),{uid:a,name:e,parentId:null,category:null,fileCount:0,createdAt:c(),updatedAt:c()})).id,uid:a,name:e,parentId:r,category:t,createdAt:new Date,updatedAt:new Date}}async function x(a){const e=l(o(a),u("name","asc"));return(await y(e)).docs.map(t=>f(t.id,t.data()))}function T(a){const e=new Map;a.forEach(t=>e.set(t.id,{...t,children:[]}));const r=[];return e.forEach(t=>{t.parentId&&e.has(t.parentId)?e.get(t.parentId).children.push(t):r.push(t)}),r}async function E(a,e,r){await g(p(n,"users",a,"folders",e),{name:r,updatedAt:c()})}async function q(a,e){await A(p(n,"users",a,"folders",e))}function C(a,e){const r=l(o(a),u("name","asc"));return m(r,t=>{e(t.docs.map(s=>f(s.id,s.data())))})}export{F as E,I as P,T as b,b as c,q as d,x as g,E as r,C as s};
