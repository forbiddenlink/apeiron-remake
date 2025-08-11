import { CELL, COLS, ROWS } from './Constants';

export class Mushroom {
  hp = 4;
  poisoned = false;
  constructor(public c:number, public r:number){}
  get x(){ return this.c * CELL }
  get y(){ return this.r * CELL }
}

export class Grid {
  cells:(Mushroom|null)[];
  constructor(public cols=COLS, public rows=ROWS){
    this.cells = new Array(cols*rows).fill(null);
  }
  idx(c:number,r:number){ return r*this.cols + c }
  in(c:number,r:number){ return c>=0 && c<this.cols && r>=0 && r<this.rows }
  get(c:number,r:number){ return this.in(c,r) ? this.cells[this.idx(c,r)] : null }
  set(c:number,r:number,v:Mushroom|null){ if(this.in(c,r)) this.cells[this.idx(c,r)] = v }
  clear(){ this.cells.fill(null); }
  countInRows(r0:number,r1:number){ let n=0; for(let r=r0;r<=r1;r++){ for(let c=0;c<this.cols;c++){ if(this.get(c,r)) n++; } } return n; }
}
