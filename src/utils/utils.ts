import {Sides} from "../types/types";

export function chooseRandomSide(): Sides{
    return  !!Math.round(Math.random()) ? "white" : "black";
}

export function chooseOppositeSide(side: Sides):Sides{
    return  side === "white" ? "black" : "white";
}

export function copyObject<T>(object: T):T{
    return JSON.parse(JSON.stringify(object))
}

