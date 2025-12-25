import { getContext, setContext } from "svelte";
import PartySocket from "partysocket";

const PARTY_SOCKET_KEY = Symbol("partySocket");

export function setPartySocket(socket: PartySocket) {
    setContext(PARTY_SOCKET_KEY, socket);
}

export function getPartySocket(): PartySocket {
    return getContext(PARTY_SOCKET_KEY);
}