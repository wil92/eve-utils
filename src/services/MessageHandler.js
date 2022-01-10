import {first, Subject, takeUntil, tap, timer} from "rxjs";

export const observable = new Subject();

window.addEventListener('message', evt => {
  observable.next(evt.data);
});

export async function sendMessageAndWaitResponse(message) {
  const id = randomId();

  window.postMessage({...message, id});
  return new Promise((resolve, reject) => {
    const subscription = observable.pipe(
      takeUntil(timer(3000).pipe(tap(() => reject('Message response time-limit')))),
      first(newMessage => {
        return newMessage.id === id && newMessage.type !== message.type;
      })
    ).subscribe(newMessage => {
      resolve(newMessage);
      subscription.unsubscribe();
    });
  });
}

export function sendMessage(message) {
  window.postMessage(message);
}

function randomId() {
  return (new Array(10).fill(0)).reduce((p) => p + 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 62)], '');
}
