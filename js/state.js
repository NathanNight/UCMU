import {seedChats} from './data.js';
export const state={
  user:'Operator',activeChat:'general',chats:structuredClone(seedChats),folders:[],people:[],messages:{},
  selectedMessageId:null,selectedChatId:null,selectedFolderId:null,replyTo:null,editingId:null,pendingDelete:null,undoTimer:null,drag:null
};
export function uid(prefix='id'){return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`}
export function activeMessages(){state.messages[state.activeChat] ||= [];return state.messages[state.activeChat]}
export function findChat(id){return state.chats.find(c=>c.id===id)}
export function findFolder(id){return state.folders.find(f=>f.id===id)}
