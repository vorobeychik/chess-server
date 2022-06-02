import {Colors} from "../types/types";

export function chooseRandomSide(){
    return  !!Math.round(Math.random()) ? "white" : "black";
}

export function chooseOppositeSide(side: Colors){
    return  side === "white" ? "black" : "white";
}