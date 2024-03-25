import './reset.css';
import './style.css';

const output = document.querySelector('#output') as HTMLParagraphElement;
const other = document.querySelector('#other') as HTMLUListElement;

const canvas = document.querySelector('#canvas') as HTMLCanvasElement;
canvas.width = canvas.height = 200;
const context = canvas.getContext('2d') as CanvasRenderingContext2D;

// MDN : https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API
const bc = new BroadcastChannel('local windows');
const me = Date.now();

// fires whenever we receive a message from the BroadcastChannel
bc.onmessage = (event: MessageEvent<Message>) => {
  // if this is the first message from a particular sender
  if (!reads.get(event.data.sender)) {
    // create its readout
    const li = document.createElement('li');
    reads.set(event.data.sender, li);
    other.appendChild(li);
  }

  // update the readout to show the new information
  const li = reads.get(event.data.sender) as HTMLLIElement;
  li.innerText = `${event.data.sender}:
  ${JSON.stringify(event.data.data, null, 2)}
  `;

  // save the last known data for later use
  screens.set(event.data.sender, event.data);
};

// MDN : https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map
const screens: Map<number, Message> = new Map();
const reads: Map<number, HTMLLIElement> = new Map();

export interface Message {
  sender: number;
  data: {
    x: number;
    y: number;
    width: number;
    height: number;
    offset: number;
  };
}

// returns the coordinates of the given message in screen space
const localToGlobal = (screen: Message) => {
  const x = screen.data.x + screen.data.width - 100;
  const y = screen.data.y + screen.data.offset + 100;
  return { x, y };
};

// returns a vector to the given message, relative to this screen's position
const globalToLocal = (them: Message) => {
  const myself = screens.get(me) as Message;
  const theirs = localToGlobal(them);
  const mine = localToGlobal(myself);
  return { x: theirs.x - mine.x, y: theirs.y - mine.y };
};

const draw = () => {
  // clear the background
  context.fillStyle = 'white';
  context.fillRect(0, 0, 200, 200);

  context.fillStyle = 'black';
  screens.forEach((dot) => {
    if (dot.sender === me) {
      // draw myself
      context.beginPath();
      context.arc(100, 100, 5, 0, 2 * Math.PI);
      context.fill();
    } else {
      // draw another dot
      const delta = globalToLocal(dot);
      context.beginPath();
      context.arc(100 + delta.x, 100 + delta.y, 5, 0, 2 * Math.PI);
      context.fill();

      // draw line pointing at other dot
      context.beginPath();
      context.moveTo(100, 100);
      const angle = Math.atan2(delta.y, delta.x);
      context.lineTo(100 + Math.cos(angle) * 50, 100 + Math.sin(angle) * 50);
      context.stroke();
    }
  });

  requestAnimationFrame(draw);
};

// We don't have an event for when the window moves.
// So we just poll it every 20ms or so.
// Yes, it's noisy.
setInterval(() => {
  /*
   * New fun with the window object:
   *
   * window.screenX : https://developer.mozilla.org/en-US/docs/Web/API/Window/screenX
   * window.screenLeft : https://developer.mozilla.org/en-US/docs/Web/API/Window/screenLeft
   * window.screenY : https://developer.mozilla.org/en-US/docs/Web/API/Window/screenY
   * window.screenTop : https://developer.mozilla.org/en-US/docs/Web/API/Window/screenTop
   *
   * window.screen.* : https://developer.mozilla.org/en-US/docs/Web/API/Screen
   *
   * window.innerWidth : https://developer.mozilla.org/en-US/docs/Web/API/Window/innerWidth
   * window.outerWidth : https://developer.mozilla.org/en-US/docs/Web/API/Window/outerWidth
   * window.innerHeight : https://developer.mozilla.org/en-US/docs/Web/API/Window/innerHeight
   * window.outerHeight : https://developer.mozilla.org/en-US/docs/Web/API/Window/outerHeight
   *
   */
  output.innerText = `Details:
  window.screenX : ${window.screenX}
  window.screenLeft : ${window.screenLeft}
  window.screenY : ${window.screenY}
  window.screenTop : ${window.screenTop}

  window.screen.width : ${window.screen.width}
  window.screen.availWidth : ${window.screen.width}
  
  window.screen.height : ${window.screen.height}
  window.screen.availHeight : ${window.screen.availHeight}

  window.innerWidth : ${window.innerWidth}
  window.outerWidth : ${window.outerWidth}
  window.innerHeight : ${window.innerHeight}
  window.outerHeight : ${window.outerHeight}
  `;

  const message: Message = {
    sender: me,
    data: {
      x: window.screenX,
      y: window.screenY,
      width: window.outerWidth,
      height: window.outerHeight,
      offset: window.outerHeight - window.innerHeight,
    },
  };
  // update my own latest information
  screens.set(me, message);

  // broadcast my information to other listeners
  bc.postMessage(message);
}, 20);

requestAnimationFrame(draw);
