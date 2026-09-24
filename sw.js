const REST_PREFIX = 'plano-treino-rest';
let restLoop = null;

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

function restVibratePattern(){
  return [400, 180, 400, 180, 400, 180, 600];
}

function restNotifyOptions(tag){
  return {
    body: 'Toque em OK para parar o alerta.',
    icon: './icon.png',
    badge: './icon.png',
    tag: tag || REST_PREFIX,
    renotify: true,
    requireInteraction: true,
    silent: false,
    vibrate: restVibratePattern(),
    timestamp: Date.now(),
    actions: [{action:'ok', title:'OK'}]
  };
}

function closeRestNotifications(){
  return self.registration.getNotifications().then(list => {
    list.forEach(n => {
      const tag = String(n.tag || '');
      if(tag === REST_PREFIX || tag.indexOf(REST_PREFIX) === 0) n.close();
    });
  });
}

function showRestNotification(title, tag){
  return self.registration.showNotification(title || 'Descanso concluído', restNotifyOptions(tag || REST_PREFIX));
}

function startRestLoop(title){
  stopRestLoop();
  const fire = () => { showRestNotification(title, REST_PREFIX); };
  fire();
  restLoop = setInterval(fire, 1600);
}

function stopRestLoop(){
  if(restLoop){
    clearInterval(restLoop);
    restLoop = null;
  }
  return closeRestNotifications();
}

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    stopRestLoop();
    await closeRestNotifications();
    const windows = await self.clients.matchAll({type:'window', includeUncontrolled:true});
    windows.forEach(client => client.postMessage({type:'rest-ok'}));
    if(windows[0]){
      try{ await windows[0].focus(); }catch(e){}
      return;
    }
    try{ await self.clients.openWindow('./'); }catch(e){}
  })());
});

self.addEventListener('notificationclose', event => {
  event.waitUntil((async () => {
    stopRestLoop();
    const windows = await self.clients.matchAll({type:'window', includeUncontrolled:true});
    windows.forEach(client => client.postMessage({type:'rest-ok'}));
  })());
});

self.addEventListener('message', event => {
  const data = event.data || {};
  if(data.type === 'rest-alarm-start'){
    startRestLoop(data.title || 'Descanso concluído');
  }
  if(data.type === 'rest-notify'){
    event.waitUntil(showRestNotification(data.title || 'Descanso concluído', data.tag || REST_PREFIX));
  }
  if(data.type === 'rest-clear' || data.type === 'rest-alarm-stop'){
    event.waitUntil(stopRestLoop());
  }
});
