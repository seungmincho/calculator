export const MEALS_KEY='toolhub-meals-v1'
export const PLAN_KEY='toolhub:meal-plan'
export const originalItems=['피자','국수','피자','김밥']
export const menuQuery=items=>'?roulette='+encodeURIComponent(items.join(','))+'&nativeMarker=keep#roulette-items'

// Quarter-turn oracle is independent of the app's radians arithmetic.
export function winnerIndex(itemCount,previousTurns,random){const turns=previousTurns+4+random;const fraction=((.75-turns)%1+1)%1;return {index:Math.floor(fraction*itemCount)%itemCount,turns}}
export async function installMenuPorts(context) {
  await context.addInitScript(()=>{
    const random=Math.random.bind(Math),raf=requestAnimationFrame.bind(window),cancel=cancelAnimationFrame.bind(window)
    window.__menuRandom=null;window.__menuRandomUsed=[];window.__menuFrames=[];window.__menuHoldFrames=false
    Math.random=()=>{if(window.__menuRandom!==null){const value=window.__menuRandom;window.__menuRandom=null;window.__menuRandomUsed.push(value);return value}return random()}
    window.requestAnimationFrame=callback=>{
      const source=Function.prototype.toString.call(callback)
      if(!source.includes('progress')||!source.includes('pointerAngle'))return raf(callback)
      const frame={callback,held:window.__menuHoldFrames,canceled:false,delivered:false};frame.id=raf(time=>{frame.time=time;if(!frame.held){frame.delivered=true;callback(time)}});window.__menuFrames.push(frame);return frame.id
    }
    window.cancelAnimationFrame=id=>{const item=window.__menuFrames.findLast(item=>item.id===id);if(item)item.canceled=true;return cancel(id)}
  })
}
