// Only supports React fixtures that render no host elements. This is not a
// browser/layout emulator; real DOM, hydration and network checks belong to the
// independent Playwright verifier. React's actual client hooks/effects run here.
class MinimalNode {
  constructor(name,document){this.nodeType=1;this.nodeName=name.toUpperCase();this.tagName=this.nodeName;this.namespaceURI='http://www.w3.org/1999/xhtml';this.ownerDocument=document;this.style={};this.childNodes=[];this.parentNode=null}
  addEventListener(){} removeEventListener(){} setAttribute(){} removeAttribute(){}
  appendChild(node){this.childNodes.push(node);node.parentNode=this;return node}
  removeChild(node){this.childNodes=this.childNodes.filter(child=>child!==node);node.parentNode=null;return node}
  insertBefore(node,before){const index=this.childNodes.indexOf(before);this.childNodes.splice(index<0?this.childNodes.length:index,0,node);node.parentNode=this;return node}
  get firstChild(){return this.childNodes[0]??null}
  get textContent(){return ''}set textContent(_value){this.childNodes=[]}
  contains(node){return node===this||this.childNodes.some(child=>child.contains?.(node))}
}
function installMinimalDom(){
  const document={nodeType:9,nodeName:'#document',addEventListener(){},removeEventListener(){},activeElement:null,createElement(name){return new MinimalNode(name,document)},createElementNS(_ns,name){return new MinimalNode(name,document)}}
  const window={document,HTMLElement:MinimalNode,HTMLIFrameElement:class{},addEventListener(){},removeEventListener(){},location:{pathname:'/',href:'https://toolhub.ai.kr/'},event:undefined}
  document.defaultView=window;document.documentElement=document.createElement('html');document.body=document.createElement('body');document.activeElement=document.body
  global.window=window;global.document=document;global.IS_REACT_ACT_ENVIRONMENT=true
  return{window,document,container:document.createElement('div')}
}
module.exports={installMinimalDom}
