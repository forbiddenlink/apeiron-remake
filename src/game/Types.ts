export interface Rect { x:number; y:number; w:number; h:number }
export function aabb(a:Rect, b:Rect){
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
