$(document).ready(function() {
    (function(window, undefined) {

    'use strict';

    var AudioPlayer = (function() {

      // Player vars
      var
      player = document.getElementById('ap'),
      playBtn,
      prevBtn,
      nextBtn,
      plBtn,
      repeatBtn,
      volumeBtn,
      progressBar,
      preloadBar,
      curTime,
      durTime,
      trackTitle,
      audio,
      index = 0,
      playList,
      volumeBar,
      volumeLength,
      repeating = false,
      seeking = false,
      rightClick = false,
      apActive = false,
      // playlist vars
      pl,
      plLi,
      // settings
      settings = {
        volume   : 0.5,
        autoPlay : false,
        notification: true,
        playList : []
      };

      function init(options) {

        if(!('classList' in document.documentElement)) {
          return false;
        }

        if(apActive || player === null) {
          return;
        }

        settings = extend(settings, options);

        // get player elements
        playBtn        = player.querySelector('.ap-toggle-btn');
        prevBtn        = player.querySelector('.ap-prev-btn');
        nextBtn        = player.querySelector('.ap-next-btn');
        repeatBtn      = player.querySelector('.ap-repeat-btn');
        volumeBtn      = player.querySelector('.ap-volume-btn');
        plBtn          = player.querySelector('.ap-playlist-btn');
        curTime        = player.querySelector('.ap-time--current');
        durTime        = player.querySelector('.ap-time--duration');
        trackTitle     = player.querySelector('.ap-title');
        progressBar    = player.querySelector('.ap-bar');
        preloadBar     = player.querySelector('.ap-preload-bar');
        volumeBar      = player.querySelector('.ap-volume-bar');

        playList = settings.playList;

        playBtn.addEventListener('click', playToggle, false);
        volumeBtn.addEventListener('click', volumeToggle, false);
        repeatBtn.addEventListener('click', repeatToggle, false);

        progressBar.parentNode.parentNode.addEventListener('mousedown', handlerBar, false);
        progressBar.parentNode.parentNode.addEventListener('mousemove', seek, false);
        document.documentElement.addEventListener('mouseup', seekingFalse, false);

        volumeBar.parentNode.parentNode.addEventListener('mousedown', handlerVol, false);
        volumeBar.parentNode.parentNode.addEventListener('mousemove', setVolume);
        document.documentElement.addEventListener('mouseup', seekingFalse, false);

        prevBtn.addEventListener('click', prev, false);
        nextBtn.addEventListener('click', next, false);


        apActive = true;

        // Create playlist
        renderPL();
        plBtn.addEventListener('click', plToggle, false);

        // Create audio object
        audio = new Audio();
        audio.volume = settings.volume;



        if(isEmptyList()) {
          empty();
          return;
        }

        audio.src = playList[index].file;
        audio.preload = 'auto';
        trackTitle.innerHTML = playList[index].title;
        volumeBar.style.height = audio.volume * 100 + '%';
        volumeLength = volumeBar.css('height');

        audio.addEventListener('error', error, false);
        audio.addEventListener('timeupdate', update, false);
        audio.addEventListener('ended', doEnd, false);

        if(settings.autoPlay) {
          audio.play();
          playBtn.classList.add('playing');
          plLi[index].classList.add('pl-current');
        }
      }

    /**
     *  PlayList methods
     */
        function renderPL() {
          var html = [];
          var tpl =
            '<li data-track="{count}">'+
              '<div class="pl-number">'+
                '<div class="pl-count">'+
                  '<svg fill="#000000" height="20" viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg">'+
                      '<path d="M0 0h24v24H0z" fill="none"/>'+
                      '<path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>'+
                  '</svg>'+
                '</div>'+
                '<div class="pl-playing">'+
                  '<div class="eq">'+
                    '<div class="eq-bar"></div>'+
                    '<div class="eq-bar"></div>'+
                    '<div class="eq-bar"></div>'+
                  '</div>'+
                '</div>'+
              '</div>'+
              '<div class="pl-title">{title}</div>'+

            '</li>';

          playList.forEach(function(item, i) {
            html.push(
              tpl.replace('{count}', i).replace('{title}', item.title)
            );
          });

          pl = create('div', {
            'className': 'pl-container hide',
            'id': 'pl',
            'innerHTML': !isEmptyList() ? '<ul class="pl-list">' + html.join('') + '</ul>' : '<div class="pl-empty">PlayList is empty</div>'
          });

          player.parentNode.insertBefore(pl, player.nextSibling);

          plLi = pl.querySelectorAll('li');

          pl.addEventListener('click', listHandler, false);
        }

        function listHandler(evt) {
          evt.preventDefault();
          if(evt.target.className === 'pl-title') {
            var current = parseInt(evt.target.parentNode.getAttribute('data-track'), 10);
            index = current;
            play();
            plActive();
          }
          else {
            var target = evt.target;
            while(target.className !== pl.className) {
              if(target.className === 'pl-remove') {
                var isDel = parseInt(target.parentNode.getAttribute('data-track'), 10);

                playList.splice(isDel, 1);
                target.parentNode.parentNode.removeChild(target.parentNode);

                plLi = pl.querySelectorAll('li');

                [].forEach.call(plLi, function(el, i) {
                  el.setAttribute('data-track', i);
                });

                if(!audio.paused) {

                  if(isDel === index) {
                    play();
                  }

                }
                else {
                  if(isEmptyList()) {
                    empty();
                  }
                  else {
                    // audio.currentTime = 0;
                    audio.src = playList[index].file;
                    document.title = trackTitle.innerHTML = playList[index].title;
                    progressBar.style.width = 0;
                  }
                }
                if(isDel < index) {
                  index--;
                }

                return;
              }
              target = target.parentNode;
            }

          }
        }

        function plActive() {
          if(audio.paused) {
            plLi[index].classList.remove('pl-current');
            return;
          }
          var current = index;
          for(var i = 0, len = plLi.length; len > i; i++) {
            plLi[i].classList.remove('pl-current');
          }
          plLi[current].classList.add('pl-current');
        }


    /**
     *  Player methods
     */
      function error() {
        !isEmptyList() && next();
      }
      function play() {

        index = (index > playList.length - 1) ? 0 : index;
        if(index < 0) index = playList.length - 1;

        if(isEmptyList()) {
          empty();
          return;
        }

        audio.src = playList[index].file;
        audio.preload = 'auto';
        document.title = trackTitle.innerHTML = playList[index].title;
        audio.play();
        notify(playList[index].title, {
          icon: playList[index].icon,
          body: 'Now playing',
          tag: 'music-player'
        });
        playBtn.classList.add('playing');
        plActive();
      }

      function prev() {
        index = index - 1;
        play();
      }

      function next() {
        index = index + 1;
        play();
      }

      function isEmptyList() {
        return playList.length === 0;
      }

      function empty() {
        audio.pause();
        audio.src = '';
        trackTitle.innerHTML = 'queue is empty';
        curTime.innerHTML = '--';
        durTime.innerHTML = '--';
        progressBar.style.width = 0;
        preloadBar.style.width = 0;
        playBtn.classList.remove('playing');
        pl.innerHTML = '<div class="pl-empty">PlayList is empty</div>';
      }

      function playToggle() {
        if(isEmptyList()) {
          return;
        }
        if(audio.paused) {
          audio.play();
          notify(playList[index].title, {
            icon: playList[index].icon,
            body: 'Now playing'
          });
          this.classList.add('playing');
        }
        else {
          audio.pause();
          this.classList.remove('playing');
        }
        plActive();
      }

      function volumeToggle() {
        if(audio.muted) {
          if(parseInt(volumeLength, 10) === 0) {
            volumeBar.style.height = '100%';
            audio.volume = 1;
          }
          else {
            volumeBar.style.height = volumeLength;
          }
          audio.muted = false;
          this.classList.remove('muted');
        }
        else {
          audio.muted = true;
          volumeBar.style.height = 0;
          this.classList.add('muted');
        }
      }

      function repeatToggle() {
        var repeat = this.classList;
        if(repeat.contains('ap-active')) {
          repeating = false;
          repeat.remove('ap-active');
        }
        else {
          repeating = true;
          repeat.add('ap-active');
        }
      }

      function plToggle() {
        this.classList.toggle('ap-active');
        pl.classList.toggle('hide');
      }

      function update() {
        if(audio.readyState === 0) return;

        var barlength = Math.round(audio.currentTime * (100 / audio.duration));
        progressBar.style.width = barlength + '%';

        var
        curMins = Math.floor(audio.currentTime / 60),
        curSecs = Math.floor(audio.currentTime - curMins * 60),
        mins = Math.floor(audio.duration / 60),
        secs = Math.floor(audio.duration - mins * 60);
        (curSecs < 10) && (curSecs = '0' + curSecs);
        (secs < 10) && (secs = '0' + secs);

        curTime.innerHTML = curMins + ':' + curSecs + " / ";
        durTime.innerHTML = mins + ':' + secs;

        var buffered = audio.buffered;
        if(buffered.length) {
          var loaded = Math.round(100 * buffered.end(0) / audio.duration);
          preloadBar.style.width = loaded + '%';
        }
      }

      function doEnd() {
        if(index === playList.length - 1) {
          if(!repeating) {
            audio.pause();
            plActive();
            playBtn.classList.remove('playing');
            return;
          }
          else {
            index = 0;
            play();
          }
        }
        else {
          index = (index === playList.length - 1) ? 0 : index + 1;
          play();
        }
      }

      function moveBar(evt, el, dir) {
        var value;
        if(dir === 'horizontal') {
          value = Math.round( ((evt.clientX - el.offset().left) + window.pageXOffset) * 100 / el.parentNode.offsetWidth);
          el.style.width = value + '%';
          return value;
        }
        else {
          var offset = (el.offset().top + el.offsetHeight)  - window.pageYOffset;
          value = Math.round((offset - evt.clientY));
          if(value > 100) value = 100;
          if(value < 0) value = 0;
          volumeBar.style.height = value + '%';
          return value;
        }
      }

      function handlerBar(evt) {
        rightClick = (evt.which === 3) ? true : false;
        seeking = true;
        seek(evt);
      }

      function handlerVol(evt) {
        rightClick = (evt.which === 3) ? true : false;
        seeking = true;
        setVolume(evt);
      }

      function seek(evt) {
        if(seeking && rightClick === false && audio.readyState !== 0) {
          var value = moveBar(evt, progressBar, 'horizontal');
          audio.currentTime = audio.duration * (value / 100);
        }
      }

      function seekingFalse() {
        seeking = false;
      }

      function setVolume(evt) {
        volumeLength = volumeBar.css('height');
        if(seeking && rightClick === false) {
          var value = moveBar(evt, volumeBar.parentNode, 'vertical') / 100;
          if(value <= 0) {
            audio.volume = 0;
            volumeBtn.classList.add('muted');
          }
          else {
            if(audio.muted) audio.muted = false;
            audio.volume = value;
            volumeBtn.classList.remove('muted');
          }
        }
      }

      function notify(title, attr) {
        if(!settings.notification) {
          return;
        }
        if(window.Notification === undefined) {
          return;
        }
        window.Notification.requestPermission(function(access) {
          if(access === 'granted') {
            var notice = new Notification(title.substr(0, 110), attr);
            notice.onshow = function() {
              setTimeout(function() {
                notice.close();
              }, 5000);
          };
            // notice.onclose = function() {
            //   if(noticeTimer) {
            //     clearTimeout(noticeTimer);
            //   }
            // }
          }
      });
      }

    /* Destroy method. Clear All */
      function destroy() {
        if(!apActive) return;

        playBtn.removeEventListener('click', playToggle, false);
        volumeBtn.removeEventListener('click', volumeToggle, false);
        repeatBtn.removeEventListener('click', repeatToggle, false);
        plBtn.removeEventListener('click', plToggle, false);

        progressBar.parentNode.parentNode.removeEventListener('mousedown', handlerBar, false);
        progressBar.parentNode.parentNode.removeEventListener('mousemove', seek, false);
        document.documentElement.removeEventListener('mouseup', seekingFalse, false);

        volumeBar.parentNode.parentNode.removeEventListener('mousedown', handlerVol, false);
        volumeBar.parentNode.parentNode.removeEventListener('mousemove', setVolume);
        document.documentElement.removeEventListener('mouseup', seekingFalse, false);

        prevBtn.removeEventListener('click', prev, false);
        nextBtn.removeEventListener('click', next, false);

        audio.removeEventListener('error', error, false);
        audio.removeEventListener('timeupdate', update, false);
        audio.removeEventListener('ended', doEnd, false);
        player.parentNode.removeChild(player);

        // Playlist
        pl.removeEventListener('click', listHandler, false);
        pl.parentNode.removeChild(pl);

        audio.pause();
        apActive = false;
      }


    /**
     *  Helpers
     */
      function extend(defaults, options) {
        for(var name in options) {
          if(defaults.hasOwnProperty(name)) {
            defaults[name] = options[name];
          }
        }
        return defaults;
      }
      function create(el, attr) {
        var element = document.createElement(el);
        if(attr) {
          for(var name in attr) {
            if(element[name] !== undefined) {
              element[name] = attr[name];
            }
          }
        }
        return element;
      }

      Element.prototype.offset = function() {
        var el = this.getBoundingClientRect(),
        scrollLeft = window.pageXOffset || document.documentElement.scrollLeft,
        scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        return {
          top: el.top + scrollTop,
          left: el.left + scrollLeft
        };
      };

      Element.prototype.css = function(attr) {
        if(typeof attr === 'string') {
          return getComputedStyle(this, '')[attr];
        }
        else if(typeof attr === 'object') {
          for(var name in attr) {
            if(this.style[name] !== undefined) {
              this.style[name] = attr[name];
            }
          }
        }
      };


    /**
     *  Public methods
     */
      return {
        init: init,
        destroy: destroy
      };

    })();

    window.AP = AudioPlayer;

    })(window);


    // test image for web notifications
    var iconImage = 'https://cldup.com/zgfeo-ZbD3.jpg';

    function shuffle(array) {
      var currentIndex = array.length, temporaryValue, randomIndex;

      // While there remain elements to shuffle...
      while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
      }

      return array;
    }

    var tracks = [
    {'icon': iconImage, 'title': '[Bungou Stray Dogs] Luck Life - Kaze Ga Fuku Machi', 'file': 'https://cldup.com/DuBocTI5p8.mp3'},
    {'icon': iconImage, 'title': '[Bungou Stray Dogs] SCREEN - Reason Living', 'file': 'https://cldup.com/HcG02bW3C1.mp3'},
    {'icon': iconImage, 'title': '[Working!!!] Popura Taneshima,Inami Mahiru,Yachiyo Todoroki - NOW GAMBLE', 'file': 'https://cldup.com/xzzpbJwUys.mp3'},
    {'icon': iconImage, 'title': '[Denpa Kyoushi] 9nine - MY ONLY ONE', 'file': 'http://dl.forunesia.com/mp3/04/%5BForunesia%5D%20MY%20ONLY%20ONE.mp3'},
    {'icon': iconImage, 'title': '[Kekkai Sensen] UNNISON SQUARE GARDEN - Sugar Song to Bitter Step', 'file': 'http://dl.forunesia.com/mp3/03/[Forunesia]%20Sugar%20Song%20to%20Bitter%20Step.mp3'},
    {'icon': iconImage, 'title': '[Basara Judge End] fear, and loathing in las vegas - ThunderClap', 'file': 'https://cldup.com/FG9bJ71A1E.mp3'},
    {'icon': iconImage, 'title': '[Kuroshitsuji - Book of Circus] SID - ENAMEL', 'file': 'https://cldup.com/J8SI3QFPY4.mp3'},
    {'icon': iconImage, 'title': '[Tseirei Tsukai no Blade Dance] Knee-Socks - Blade Dance', 'file': 'http://archive.forunesia.com/downloads/mp3_8/[Forunesia]%20Blade%20Dance.mp3'},
    {'icon': iconImage, 'title': '[Tseirei Tsukai no Blade Dance] Hitomi Harada - Kyoumei no True Force', 'file': 'http://archive.forunesia.com/downloads/mp3_8/%5BForunesia%5D%20Kyoumei%20no%20True%20Force.mp3'},
    {'icon': iconImage, 'title': '[Sword Art Online] Haruka Tomatsu - Courage', 'file': 'http://dl.forunesia.com/mp3/01/[Forunesia]%20courage.mp3'},
    {'icon': iconImage, 'title': '[Shigatsu wa Kimi no Uso] Coala Mode - Nanairo Symphony', 'file': 'http://dl.forunesia.com/mp3/02/[Forunesia]%20Nanairo%20Symphony.mp3'},
    {'icon': iconImage, 'title': '[To Love-Ru -Trouble- Darkness 2nd] Ray - secret arms', 'file': 'http://dl.forunesia.com/mp3/04/[Forunesia]%20secret%20arms.mp3'},
    {'icon': iconImage, 'title': '[GOD EATER] OLDCODEX - Feed A', 'file': 'http://dl.forunesia.com/mp3/04/[Forunesia]%20Feed%20A.mp3'},
    {'icon': iconImage, 'title': '[Durarara-x2 Ten] Toshiyuki Toyonaga - Day you laugh', 'file': 'http://dl.forunesia.com/mp3/04/%5BForunesia%5D%20Day%20you%20laugh.mp3'},
    {'icon': iconImage, 'title': '[Yamada-kun to 7-nin no Majo] WEAVER - Kuchizuke Diamond', 'file': 'http://dl.forunesia.com/mp3/03/[Forunesia]%20Kuchizuke%20Diamond.mp3'},
    {'icon': iconImage, 'title': '[Owarimonogatari] Alisa Takigawa - Sayonara no Yukue', 'file': 'https://cldup.com/Og2ouR41LP.mp3'},
    {'icon': iconImage, 'title': '[Barakamon] Super Beaver - Rashisa', 'file': 'http://archive.forunesia.com/downloads/mp3_8/[Forunesia]%20Rashisa.mp3'},
    {'icon': iconImage, 'title': '[Zutto Mae Kara Suki Deshita~Kokuhaku Jikkou Iinkai] CHiCO with HoneyWorks - Koi-iro ni Sake', 'file': 'http://dl.forunesia.com/mp3/07/[Forunesia]%20Koi-iro%20ni%20Sake.mp3'},
    {'icon': iconImage, 'title': '[Amaama to Inazuma] Brian The Sun - Maybe', 'file': 'https://cldup.com/ez9UYCnhmN.mp3'},
    {'icon': iconImage, 'title': '[Charlotte] Uchida Maaya - Hatsunetsu Days', 'file': 'http://dl.forunesia.com/mp3/04/%5BForunesia%5D%20Hatsunetsu%20Days.mp3'},
    {'icon': iconImage, 'title': '[Charlotte] Uchida Maaya - Rakuen Project', 'file': 'http://dl.forunesia.com/mp3/04/%5BForunesia%5D%20Rakuen%20Made.mp3'},
    {'icon': iconImage, 'title': '[Rewrite] Aoi Tada - Word of Dawn', 'file': 'http://dl.forunesia.com/mp3/07/[Forunesia]%20Word%20of%20Dawn.mp3'},
    {'icon': iconImage, 'title': '[Ao Haru Ride] Chelsy - I will', 'file': 'http://archive.forunesia.com/downloads/mp3_8/[Forunesia]%20I%20will%20[PV%20ver].mp3'},
    {'icon': iconImage, 'title': '[Qualidea Code] Claris x GARNIDELIA - Clever', 'file': 'http://dl.forunesia.com/mp3/07/[Forunesia]%20clever.mp3'},
    {'icon': iconImage, 'title': '[Love Live! Sunshine!!] Aqours - Mijuku DREAMER', 'file': 'http://dl.forunesia.com/mp3/07/[Forunesia]%20Mijuku%20DREAMER.mp3'},
    {'icon': iconImage, 'title': '[Love Live! Sunshine!!] Aqours - Yume de Yozora wo Terashitai', 'file': 'http://dl.forunesia.com/mp3/07/[Forunesia]%20Yume%20de%20Yozora%20wo%20Terashitai.mp3'},
    {'icon': iconImage, 'title': '[Kiznaiver] Sangatsu no Phantasia - Hajimari no Sokudo', 'file': 'http://dl.forunesia.com/mp3/07/[Forunesia]%20Hajimari%20no%20Sokudo.mp3'},
    {'icon': iconImage, 'title': '[Aoki Hagane no Arpeggio: Ars Nova] Nano - SAVIOR OF SONG', 'file': 'https://cldup.com/L79Ms-RUep.mp3'},
    {'icon': iconImage, 'title': '[Aoki Hagane no Arpeggio: Ars Nova] Trident - Blue Destiny', 'file': 'https://cldup.com/FaHVtNIrOZ.mp3'},
    {'icon': iconImage, 'title': '[Kekkai Sensen] BUMP OF CHICKEN - Hello World', 'file': 'https://cldup.com/I8KD5jpM5I.mp3'},
    {'icon': iconImage, 'title': '[Naruto Shippuden] Hemenway - By My Side', 'file': 'https://cldup.com/p4XTDVpTIx.mp3'},
    {'icon': iconImage, 'title': '[Kiseijuu sei no kakuritsu] Daichi - Its Right Time', 'file': 'https://cldup.com/yTuMEKjAtf.mp3'},
    {'icon': iconImage, 'title': '[Qualidea Code] LISA - Break Freak Out', 'file': 'https://cldup.com/zrm6xu-x47.mp3'},
    {'icon': iconImage, 'title': '[Qualidea Code] Claris - Gravity', 'file': 'https://cldup.com/Nvw0akFaIN.mp3'},
    {'icon': iconImage, 'title': '[Qualidea Code] GARNIDELIA - Yakusoku - Promise code-', 'file': 'https://cldup.com/T66Ya8hx6p.mp3'},
    {'icon': iconImage, 'title': '[Re:zero kara hajimeru isekai seikatsu] MYTH & ROID - Paradisus-Paradoxum', 'file': 'https://cldup.com/66g9WyBIKi.mp3'},
    {'icon': iconImage, 'title': 'Emilia [CV.Rie Takahashi] - Stay Alive', 'file': 'https://cldup.com/9JVUwlSRBS.mp3'},
    {'icon': iconImage, 'title': 'Rem [CV.Inori Minase] - Whishing', 'file': 'https://cldup.com/R3Ow5-dRAG.mp3'},
    {'icon': iconImage, 'title': 'Emilia [CV.Rie Takahashi] - Bouya no Yume Yo', 'file': 'https://cldup.com/84cAPCrLz4.mp3'},
    {'icon': iconImage, 'title': '[Love Live! Sunshine!!] Aquors - Yume Kataru yori Yume Utaou', 'file': 'https://cldup.com/gt0g4aOtXE.mp3'},
    {'icon': iconImage, 'title': '[Love Live! Sunshine!!] Aqours - Aozora Jumping Hearrt', 'file': 'https://cldup.com/1DZYjClgzH.mp3'},
    {'icon': iconImage, 'title': '[Love Live! Sunshine!!] Aqours &#8211; Kimeta yo Hand in Hand', 'file': 'https://cldup.com/VdD8bDBQPX.mp3'},
    {'icon': iconImage, 'title': '[Love Live! Sunshine!!] Aqours - Daisuki Dattara Daijoubu', 'file': 'https://cldup.com/KdA5MehpAA.mp3'},
    {'icon': iconImage, 'title': '[Shokugeki no Souma 2nd] SCREEN mode - ROUGH DIAMONDS', 'file': 'https://cldup.com/bMOXmLhfjn.mp3'},
    {'icon': iconImage, 'title': '[Shokugeki no Souma 2nd] Nano.Ripe - SnowDrop', 'file': 'https://cldup.com/RLzKq6tRUP.mp3'},
    {'icon': iconImage, 'title': '[Kono Bijutsubu] Nana Mizuki - STARTING NOW', 'file': 'https://cldup.com/xj3BtikE9y.mp3'},
    {'icon': iconImage, 'title': '[Kono Bijutsubu] Sumire Uesaka - Koisuru zukei', 'file': 'https://cldup.com/XXCbXoaRkp.mp3'},
    {'icon': iconImage, 'title': '[Tales Of Zestiria X] FLOW - Kaze no Uta', 'file': 'https://cldup.com/prKNuAhTgP.mp3'},
    {'icon': iconImage, 'title': '[Rewrite] Runa Mizutani - Sasayaki na Hajimari', 'file': 'https://cldup.com/ORzV-GfXGC.mp3'},
    {'icon': iconImage, 'title': '[Nejimaki Seirei Senki] kishida kyoudan & the akeboshi rockets - Tenkyou no Alderamin', 'file': 'https://cldup.com/uDxc0ZtIuo.mp3'},
    {'icon': iconImage, 'title': '[Shigatsu Kimi wa no Uso LA] Ikimonogakari - Last Scene', 'file': 'https://cldup.com/B5-SW9EVLS.mp3'},
    {'icon': iconImage, 'title': '[Ange Vierge] Konomi Suzuki - Love is MY RAIL', 'file': 'https://cldup.com/mWzadFz-RS.mp3'},
    {'icon': iconImage, 'title': '[Naruto Shippuden] ASIAN KUNG FU GENERATION - Blood Circulator', 'file': 'https://cldup.com/xF0vV2D5fF.mp3'},
    {'icon': iconImage, 'title': '[Gochuumon wa Usagi Desu ga?] Chimame-Tai - Poopin Jump', 'file': 'https://cldup.com/8qbfL83U9v.mp3'},
    {'icon': iconImage, 'title': '[Gochuumon wa Usagi Desu ka??] Pettit Rabit - No Poi!', 'file': 'https://cldup.com/5UaaIRKoxG.mp3'},
    {'icon': iconImage, 'title': '[Gochuumon wa Usagi Desu ka??] Chimame-Tai - Tokimeki Poporon', 'file': 'https://cldup.com/dKHjWi4WxH.mp3'},
    {'icon': iconImage, 'title': '[Bakemonogatari] Supercell - Kimi ni Shiranai Monogatari', 'file': 'https://cldup.com/vICKUSvG3b.mp3'},
    {'icon': iconImage, 'title': '[Bungou Stray Dogs] GRANRODEO - TRASH CANDY', 'file': 'https://cldup.com/8L7CoSujpw.mp3'},
    {'icon': iconImage, 'title': '[Bungou Stray Dogs] Luck Life - Name wo Yobu yo', 'file': 'https://cldup.com/mPcsbMXq4l.mp3'},
    {'icon': iconImage, 'title': '[Re:zero kara hajimeru isekai seikatsu] Suzuki Konomi - Redo', 'file': 'https://cldup.com/MjwrWcbqUp.mp3'},
    {'icon': iconImage, 'title': '[Macross Delta] Walküre - Ichido dakeno Koi nara', 'file': 'https://cldup.com/YmmMatWp_B.mp3'},
    {'icon': iconImage, 'title': '[Macross Delta] Walkure - Runne ga Pikatto Hikattara', 'file': 'https://cldup.com/vo4oNN9wEm.mp3'},
    {'icon': iconImage, 'title': '[Macross Delta] Walkure - Ikenai Borderline', 'file': 'https://cldup.com/eKQyNack8v.mp3'},
    {'icon': iconImage, 'title': '[Re:zero kara hajimeru isekai seikatsu] MYTH & ROID - STYX HELIX', 'file': 'https://cldup.com/ISfQB51oA6.mp3'},
    {'icon': iconImage, 'title': '[Netoge no Yome] Luce Twinkle Wink? - 1st Love Story', 'file': 'https://cldup.com/i4MoFDIqZt.mp3'},
    {'icon': iconImage, 'title': '[Haifuri] TrySail - High Free Spirits', 'file': 'https://cldup.com/jOoIK-QEaO.mp3'},
    {'icon': iconImage, 'title': '[Gakusen Toshi Asterisk 2nd] Shiena Nishizawa - The Asterisk War', 'file': 'https://cldup.com/qJb78uIn7L.mp3'},
    {'icon': iconImage, 'title': '[Gakusen Toshi Asterisk 2nd] Haruka Chisuga - Ai no Uta -words of love-', 'file': 'https://cldup.com/dQ439t_d-c.mp3'},
    {'icon': iconImage, 'title': '[Koutetsujou no Kabaneri] Aimer with chelly(EGOIST) - nineline', 'file': 'https://cldup.com/RviaLnq9oT.mp3'},
    {'icon': iconImage, 'title': '[Koutetsujou no Kabaneri] EGOIST - KABANERI OF THE IRON FORTRESS', 'file': 'https://cldup.com/PU_EjNruFn.mp3'},
    {'icon': iconImage, 'title': '[Ansatsu Kyoushitsu 2nd] 3-nen E-gumi Utatan - Bye bye Yesterday', 'file': 'https://cldup.com/asWWc9gZ7Y.mp3'},
    {'icon': iconImage, 'title': '[Dimension W] FoxTails - Contrast', 'file': 'https://cldup.com/mLboPvE4AR.mp3'},
    {'icon': iconImage, 'title': '[Divine Gate] Hitorie - ONE ME TWO HEARTS', 'file': 'https://cldup.com/iXvDcMLCa7.mp3'},
    {'icon': iconImage, 'title': '[Divine Gate] Vitslip - Contrast', 'file': 'https://cldup.com/jUfxbpntXa.mp3'},
    {'icon': iconImage, 'title': '[Big Order] Yousei Teikoku - DISORDER', 'file': 'https://cldup.com/J5t8Cu-ARM.mp3'},
    {'icon': iconImage, 'title': '[Nisekoi] Claris - STEP', 'file': 'https://cldup.com/Xi__n3JA4P.mp3'},
    {'icon': iconImage, 'title': '[Nisekoi] Kirisaki Chitoge [CV.Nao Touyama] - Heart Pattern', 'file': 'https://cldup.com/6MhtMy8Pg9.mp3'},
    {'icon': iconImage, 'title': '[Nisekoi] Claris - Click', 'file': 'https://cldup.com/lqMRj5v4C2.mp3'},
    {'icon': iconImage, 'title': '[Nisekoi] Onodera Kosaki [CV.Kana Hanazawa] - Recover Decoration', 'file': 'https://cldup.com/r2G0UdN2i6.mp3'},
    {'icon': iconImage, 'title': '[Nisekoi] Tsugumi Seishirou [CV.Mikako Komatsu] - TRICK BOX', 'file': 'https://cldup.com/bZts86XwJu.mp3'},
    {'icon': iconImage, 'title': '[Nisekoi] - Souzou Diary', 'file': 'https://cldup.com/PG1sJcIG4q.mp3'},
    {'icon': iconImage, 'title': '[Nisekoi] Nao Touyama & Kana Hanazawa - Honmei Answer', 'file': 'https://cldup.com/vj5yN-k43P.mp3'},
    {'icon': iconImage, 'title': '[Nisekoi] - Hanagonomi', 'file': 'https://cldup.com/gGwaVU09JU.mp3'},
    {'icon': iconImage, 'title': '[Nisekoi] - Order x order', 'file': 'https://cldup.com/mC6xwrhdOq.mp3'},
    {'icon': iconImage, 'title': '[Nisekoi] - Blue Schedule', 'file': 'http://50.7.54.34/ost/nisekoi-best-songs/xyebmodljq/09%20-%20Blue%20Schedule.mp3'},
    {'icon': iconImage, 'title': '[Nisekoi] - AIMAI-Hz', 'file': 'https://cldup.com/cLXaomtt97.mp3'},
    {'icon': iconImage, 'title': '[Nisekoi] Tsugumi Seishirou [CV.Mikako Komatsu] - TrIGgER', 'file': 'http://50.7.54.34/ost/nisekoi-2-ed1-ed2-single/toehircbus/02%20-%20TrIGgER.mp3'},
    {'icon': iconImage, 'title': '[Nisekoi] LISA - Rally Go Round', 'file': 'https://cldup.com/dpO5JwcJa6.mp3'},
    {'icon': iconImage, 'title': '[Nisekoi] Nao Touyama & Kana Hanazawa - Taisetsu no Tsukurikata', 'file': 'https://cldup.com/a6GNaCaQI1.mp3'},
    {'icon': iconImage, 'title': '[Musaigen Phantom no World] SCREEN mode - Naked Dive', 'file': 'https://cldup.com/Tsi66x_M1I.mp3'},
    {'icon': iconImage, 'title': '[Musaigen Phantom no World] Azusa Tadokoro - Junshin Always', 'file': 'https://cldup.com/cfH_BW3jGY.mp3'},
    {'icon': iconImage, 'title': '[Overlord] OxT - Clattanoia', 'file': 'https://cldup.com/IuVMvaQnLt.mp3'},
    {'icon': iconImage, 'title': '[Prince of Stride] OxT - STRIDERs HIGH', 'file': 'https://cldup.com/RLuqCqr_Rf.mp3'},
    {'icon': iconImage, 'title': '[Shigatsu Kimiwa no Uso] Seven oops - Orange', 'file': 'https://cldup.com/JU1CHI7Yvp.mp3'},
    {'icon': iconImage, 'title': '[Love Live!] u s - Donna Toki mo Zutto', 'file': 'https://cldup.com/_J_5ExD1q7.mp3'},
    {'icon': iconImage, 'title': 'Clif Edge - Endless Tears', 'file': 'https://cldup.com/tUVPC8uaXJ.mp3'},
    {'icon': iconImage, 'title': '[Nisemonogatari] Kana Hanazawa - Renai Circulation', 'file': 'https://cldup.com/yba7HOr_an.mp3'},
    {'icon': iconImage, 'title': '[Nisemonogatari] Yuka Iguchi - Platinum Disco', 'file': 'https://cldup.com/xwyAxuese7.mp3'},
    {'icon': iconImage, 'title': 'Nadeko & Tsukihi Mash Up - Platinum Disco & Renai Circulation', 'file': 'https://cldup.com/x5OA-5rH6p.mp3'},
    {'icon': iconImage, 'title': '[Ansatsu Kyoushitsu 2nd] 3-nen E-gumi Utatan - QUESTION', 'file': 'https://cldup.com/O9DMYCa9LU.mp3'},
    {'icon': iconImage, 'title': '[New Game!] fourfolium - SAHURA SKIP', 'file': 'https://cldup.com/CbswI9t9fL.mp3'},
    {'icon': iconImage, 'title': '[Love Live!] u s - Kitto Seishun ga Kikoeru', 'file': 'https://cldup.com/M5ZR-ZbbWH.mp3'},
    {'icon': iconImage, 'title': '[TGWOK] Itou Kanae & Hayami Saori & Koshimizu Ami & Asumi Kana & Toyosaki Aki - Ai no Yokan', 'file': 'https://cldup.com/E_QtciwdKI.mp3'},
    {'icon': iconImage, 'title': '[Angel Beats] Aoi Tada - Brave Song', 'file': 'https://cldup.com/7qsXy1pxUb.mp3'},
    {'icon': iconImage, 'title': '[Aldnoah Zero] Kalafina - Heavenly Blue', 'file': 'https://cldup.com/kFaAGe0tiO.mp3'},
    {'icon': iconImage, 'title': '[Aldnoah Zero s2] Sawano Hiroyuki - &Z', 'file': 'https://cldup.com/CvqOEO5M-L.mp3'},
    {'icon': iconImage, 'title': '[Tokyo Ghoul s2] Osterrich - Munou', 'file': 'https://cldup.com/lMhZ3Fao4n.mp3'},
    {'icon': iconImage, 'title': '[Tokyo Ghoul] Ling Tosite Sigure - Unravel', 'file': 'https://cldup.com/tnn8o-kgJj.mp3'},
    {'icon': iconImage, 'title': '[Magi: Sinbad no Bouken] FujiFabric - Polaris', 'file': 'https://cldup.com/zBCJmP4nTR.mp3'},
    {'icon': iconImage, 'title': '[Bakuon!!] - Buon! Buon! Ride On!', 'file': 'https://cldup.com/3sb9x_1jad.mp3'},
    {'icon': iconImage, 'title': '[Sword Art Online] LISA - Crossing Field', 'file': 'https://cldup.com/2z0oInhUkv.mp3'},
    {'icon': iconImage, 'title': '[Mahouka Koukou no Retosei] LISA - Rising Hope', 'file': 'https://cldup.com/gqSsvOLVr2.mp3'},
    {'icon': iconImage, 'title': '[Fate/Zero] LISA - Oath Sign', 'file': 'https://cldup.com/ciyj_iNnPQ.mp3'},
    {'icon': iconImage, 'title': '[Sankarea] Nano.Ripe - Esoragoto', 'file': 'https://cldup.com/8J6y3Nk6TG.mp3'},
    {'icon': iconImage, 'title': '[Hataraku Maou-sama] Nano.Ripe - Star Chart', 'file': 'https://cldup.com/EEbhbIIOcR.mp3'},
    {'icon': iconImage, 'title': '[Hataraku Maou-sama] Nano.Ripe - Tsumabiku Hitori', 'file': 'https://cldup.com/EWjruPzWsF.mp3'},
    {'icon': iconImage, 'title': '[Hataraku Maou-sama] Nano.Ripe - Tsuki Hana', 'file': 'https://cldup.com/VBcX5lFStS.mp3'},
    {'icon': iconImage, 'title': '[Saijaku Muhai no Bahamut] Nano.Ripe - Lime Tree', 'file': 'https://cldup.com/bn62qjB5QU.mp3'},
    {'icon': iconImage, 'title': '[BTOOOM] Nano - No Pain, No Game', 'file': 'https://cldup.com/2IIbE2L3bO.mp3'},
    {'icon': iconImage, 'title': '[Hidan no Aria AA] Nano - Bullseye', 'file': 'https://cldup.com/HdL1Xr4-tZ.mp3'},
    {'icon': iconImage, 'title': 'Yuki Asuna [CV.Haruka Tomatsu] - Yume Sekai', 'file': 'https://cldup.com/n2koEMzxUe.mp3'},
    {'icon': iconImage, 'title': 'Yukinoshita Yukino [CV.Hayami Saori] - Yukidoke ni Saita Hana', 'file': 'https://cldup.com/YK9gpTO0Tx.mp3'},
    {'icon': iconImage, 'title': '[K-ON] Houkago Tea Time - Fuwa Fuwa Time', 'file': 'https://cldup.com/Oym7ffQ1Ql.mp3'},
    {'icon': iconImage, 'title': '[Tokyo Ravens] Maoun Kurosaki - X encounter ', 'file': 'https://cldup.com/JUns3YCKID.mp3'},
    {'icon': iconImage, 'title': '[Toradora] Yui Horie - Vanila Salt', 'file': 'https://cldup.com/xUBk8KoqrQ.mp3'},
    {'icon': iconImage, 'title': '[Toradora] Yui Horie - Silky Heart', 'file': 'https://cldup.com/ltD0Fq-g7E.mp3'},
    {'icon': iconImage, 'title': 'Tokyo Ghoul - Glassy Sky', 'file': 'https://cldup.com/lWdaU2wejI.mp3'},
    {'icon': iconImage, 'title': '[Kokoro Connect] Lia - I scream Chocolate', 'file': 'https://cldup.com/xjMn1NsDSW.mp3'},
    {'icon': iconImage, 'title': '[One Punch Man] JAM PROJECT - THE HERO !! Okoreru Kobushi ni Hi wo Tsukero', 'file': 'https://cldup.com/MzZMNoRmFm.mp3'},
    {'icon': iconImage, 'title': '[Nisemonogatari] Kitamura Eri - Marshmallow Justice', 'file': 'https://cldup.com/Gj_MKNfcig.mp3'},
    {'icon': iconImage, 'title': '[Tokyo Ghoul] People In The Box - Seijatachi', 'file': 'https://cldup.com/kD6i0-UY1s.mp3'},
    {'icon': iconImage, 'title': '[Sword Art Online] LISA - Shirushi', 'file': 'https://cldup.com/gJv6dEyoLf.mp3'},
    {'icon': iconImage, 'title': '[GATE Jietai] - Prism Communicate', 'file': 'https://cldup.com/dVMHn77O4v.mp3'},
    {'icon': iconImage, 'title': '[No Game No Life] Ai Kayano - Oracion', 'file': 'https://cldup.com/4sTyi1YxHR.mp3'},
    {'icon': iconImage, 'title': '[Shigatsu Kimi wa no Uso] Coala Mode - Nanairo Symphony', 'file': 'https://cldup.com/QEQO1ZtT01.mp3'},
    {'icon': iconImage, 'title': '[Angel Beats] Lia - My Soul Your Beats', 'file': 'https://cldup.com/pw5-P4fNFz.mp3'},
    {'icon': iconImage, 'title': '[Noragami Aragoto] THE ORAL CIGARETTES - Kyouran Hey Kids!!', 'file': 'http://50.7.54.34/ost/noragami-aragoto-op-single-kyouran-hey-kids/pzcdittiqd/01%20-%20Kyouran%20Hey%20Kids%21%21.mp3'},
    {'icon': iconImage, 'title': '[Noragami Aragoto] Tia/Supercell - Nirvana', 'file': 'http://50.7.54.34/ost/noragami-aragoto-ed-single-nirvana/ookiljwpzw/01%20-%20Nirvana.mp3'},
    {'icon': iconImage, 'title': '[No Game No Life] Yoko Hikasa - Light of Hope', 'file': 'https://cldup.com/VdrzYN1dSg.mp3'},
    {'icon': iconImage, 'title': '[Toradora] Kugimiya Rie, Horie Yui, Kitamura Eri - Orange', 'file': 'https://cldup.com/isfflaCiyW.mp3'},
    {'icon': iconImage, 'title': '[Oregairu] Nagi Yanagi - Harumodoki', 'file': 'https://cldup.com/Dydhvad0xT.mp3'},
    {'icon': iconImage, 'title': '[Oregairu] Yukinoshita & Yuigahama - Everyday World', 'file': 'https://cldup.com/VV3uriggej.mp3'},
    {'icon': iconImage, 'title': '[Gintama] Spyair - Samurai Heart (Some Like It Hot!!)', 'file': 'http://50.7.54.34/ost/gintama-ed-single-samurai-heart-some-like-it-hot/zjejraiyov/01%20-%20Samurai%20Heart%20%28Some%20Like%20It%20Hot%21%21%29.mp3'},
    {'icon': iconImage, 'title': '[Gintama] THREE LIGHTS DOWN KINGS - Glorious Days', 'file': 'https://cldup.com/sAOfHc1COA.mp3'},
    {'icon': iconImage, 'title': '[Durarara!!x2 Shou] THREE LIGHTS DOWN KINGS - NEVER SAY NEVER', 'file': 'https://cldup.com/AIfDzVgsni.mp3'},
    {'icon': iconImage, 'title': '[Akame ga Kill] Rika Mayama - Liar Mask', 'file': 'https://cldup.com/Xu_x_QVxi1.mp3'},
    {'icon': iconImage, 'title': '[Akame ga Kill] Sora Amamiya - Tsuki Akari', 'file': 'https://cldup.com/QF6qKG8GJz.mp3'},
    {'icon': iconImage, 'title': '[Akame ga Kill] Sora Amamiya - Skyreach', 'file': 'https://cldup.com/AFRwfwnMD6.mp3'},
    {'icon': iconImage, 'title': '[Naruto Shippuden] UNLIMITS - Cascade', 'file': 'https://cldup.com/3XIC8NxcND.mp3'},
    {'icon': iconImage, 'title': '[Absolute Duo] Julie Sigtuna & Lilith Bristol (CV.Nozomi Yamamoto, Haruka Yamazaki) - Apple Tea no Aji', 'file': 'https://cldup.com/66NLBCCbbd.mp3'},
    {'icon': iconImage, 'title': '[Guilty Crown] EGOIST - Departures ~Anata ni Okuru Ai no Uta~', 'file': 'https://cldup.com/qSMsbyYx43.mp3'},
    {'icon': iconImage, 'title': '[Gate Jietai] Kishida Kyoudan & the Akeboshi Rockets - GATE II ~Sekai wo Koete~', 'file': 'https://cldup.com/8VX_TO1wNw.mp3'},
    {'icon': iconImage, 'title': '[Gate Jietai] Kishida Kyoudan & the Akeboshi Rockets - GATE ~Sore wa Akatsuki no You ni', 'file': 'https://cldup.com/HelpW8meoz.mp3'},
    {'icon': iconImage, 'title': '[Gate Jietai] Lelei, Rory & Tuka (CV. Nao Touyama, Risa Taneda, Hisako Kanemoto) - Prism Communication', 'file': 'https://cldup.com/dVMHn77O4v.mp3'},
    {'icon': iconImage, 'title': '[Gate Jietai] Lelei, Rory & Tuka (CV. Nao Touyama, Risa Taneda, Hisako Kanemoto) - Itsu datte Communication', 'file': 'https://cldup.com/wVJ6BB9p-S.mp3'},
    {'icon': iconImage, 'title': '[Angel Beats] Lia - Heartily Song', 'file': 'https://cldup.com/C_COEvPkff.mp3'},
    {'icon': iconImage, 'title': '[Sakurasou no Pet Na Kanojo] Suzuki Konomi - Days of Dash', 'file': 'https://cldup.com/MhK8cELA32.mp3'},
    {'icon': iconImage, 'title': '[Shakugan no Shana] Kawada Mami - Hishoku no Sora', 'file': 'https://cldup.com/c8T3iZ38-s.mp3'},
    {'icon': iconImage, 'title': '[Naruto Shippuden] Dish - I Can Hear', 'file': 'https://cldup.com/FLuxWoRL6Y.mp3'},
    {'icon': iconImage, 'title': '[Ao no Exorcist] ROKIEZ is PUNK z - IN MY WORLD', 'file': 'https://cldup.com/FJGfhxP2gA.mp3'},
    {'icon': iconImage, 'title': '[To Aru Majutsu no Index] Kawada Mami - masterpiece', 'file': 'https://cldup.com/X5PsVQQMge.mp3'},
    {'icon': iconImage, 'title': '[Baka to Test] Asuo Natsuko - Perfect-area complete!', 'file': 'https://cldup.com/ict3iB-HQa.mp3'},
    {'icon': iconImage, 'title': '[Naruto Shippuden] TOTALFAT - Place to Try', 'file': 'https://cldup.com/AwuUNmBvO5.mp3'},
    {'icon': iconImage, 'title': '[Gintama] Tommy heavenly6 - Pray', 'file': 'https://cldup.com/ZkvFY8Xf8L.mp3'},
    {'icon': iconImage, 'title': '[Toradora] Kigumiya Rie & Horie Yui & Kitamura Eri - Pe-Parade', 'file': 'https://cldup.com/PmlW1ND_c4.mp3'},
    {'icon': iconImage, 'title': '[To Aru Majutsu no Index] Kawada Mami - PSI missing', 'file': 'https://cldup.com/OTvqX5eowE.mp3'},
    {'icon': iconImage, 'title': '[To Love ru] Ray - Rakuen Project', 'file': 'https://cldup.com/bEGUzGjMah.mp3'},
    {'icon': iconImage, 'title': '[To Aru Kagaku no Railgun] ELISA - Real Force', 'file': 'https://cldup.com/zkFD7W4OSp.mp3'},
    {'icon': iconImage, 'title': '[To Aru Kagaku no Railgun] Misawa Sachika - Links', 'file': 'https://cldup.com/Y_9W_o-yej.mp3'},
    {'icon': iconImage, 'title': '[Oreimo] Claris - reunion', 'file': 'https://cldup.com/72egFfXEoH.mp3'},
    {'icon': iconImage, 'title': '[Kantai Collection] AKINO from bless4 - Miiro', 'file': 'https://cldup.com/yF60hFXIJd.mp3'},
    {'icon': iconImage, 'title': '[Punchline] Ayumikurikamaki - Mitsu Mitsu Mitsu', 'file': 'https://cldup.com/c-CMlInNgZ.mp3'},
    {'icon': iconImage, 'title': '[Guilty Crown] - Release My Soul', 'file': 'https://cldup.com/bIgEB9OsYS.mp3'},
    {'icon': iconImage, 'title': '[Gate Jietai] Lelei (Cv.Nao Touyama) - Toumei Na Mizu Umi', 'file': 'https://cldup.com/Z041kgEL-m.mp3'},
    {'icon': iconImage, 'title': '[Hibike Euphonium!] Kitauji Quartet - Tutti', 'file': 'https://cldup.com/Wn706uu9iE.mp3'},
    {'icon': iconImage, 'title': '[Nisekoi] Onodera Kosaki (CV.Kana Hanazawa) - White Gift', 'file': 'https://cldup.com/HJjq1_mYQt.mp3'},
    {'icon': iconImage, 'title': '[Gangsta] Annabel - Yoru no Kuni', 'file': 'https://cldup.com/ulBz1JwKuk.mp3'},
    {'icon': iconImage, 'title': '[Noragami] Tia - Chotto Dekakete Kimasu', 'file': 'https://cldup.com/UOwhenVIsl.mp3'},
    {'icon': iconImage, 'title': '[MAD AMV] White Sweet Love', 'file': 'https://cldup.com/6Q5sabWKWM.mp3'},
    {'icon': iconImage, 'title': '[KoiChoco] Ceui - Kaze no Naka no Promise', 'file': 'https://cldup.com/kLuzXCQVtj.mp3'},
    {'icon': iconImage, 'title': '[TGWOK] Touyama Nao & Nazuka Kaori & Hanazawa Kana & Takagaki Ayahi & Taketatsu Ayana - Kizuna no Yukue', 'file': 'https://cldup.com/awteAl41bs.mp3'},
    {'icon': iconImage, 'title': '[Naruto Shippuden] Supercell - Utakata Hanabi', 'file': 'https://cldup.com/vdddjMHBXQ.mp3'},
    {'icon': iconImage, 'title': '[Dagashi Kashi] Ayana Teketatsu - Hey Queen', 'file': 'https://cldup.com/MrZAz1tDld.mp3'},
    {'icon': iconImage, 'title': '[Akagami no Shirayukihime] Saori Hayami - Yasashii Kibou', 'file': 'http://50.7.54.34/ost/akagami-no-shirayukihime-op-single-yasashii-kibou/vbznwvevec/01%20-%20Yasashii%20Kibou.mp3'},
    {'icon': iconImage, 'title': '[Aldnoah Zero] Sawano Hiroyuki - [nZk]', 'file': 'http://50.7.54.34/ost/aldnoah-zero-ed1-ed2-single-az/fgkqjhxqxw/01%20-%20%5BnZk%5D.mp3'},
    {'icon': iconImage, 'title': '[Aldnoah Zero] Sawano Hiroyuki - A/Z', 'file': 'http://50.7.54.34/ost/aldnoah-zero-ed1-ed2-single-az/ieiwomkcac/02%20-%20AZ.mp3'},
    {'icon': iconImage, 'title': '[Aldnoah Zero] Sawano Hiroyuki - aLIEz', 'file': 'http://50.7.54.34/ost/aldnoah-zero-ed1-ed2-single-az/mbatssvucb/03%20-%20aLIEz.mp3'},
    {'icon': iconImage, 'title': '[Aldnoah Zero S2] Aoi Eir - GENESIS', 'file': 'http://50.7.54.34/ost/aldnoah-zero-ed3-single-genesis/cwwogvflqz/01%20-%20GENESIS.mp3'},
    {'icon': iconImage, 'title': '[Angel Beats] LISA - Thousand Enemies', 'file': 'http://50.7.54.34/ost/angel-beats-insert-song-album-keep-the-beats/lgfdtsakha/02%20-%20Thousand%20Enemies.mp3'},
    {'icon': iconImage, 'title': '[Angel Beats] LISA - Ichiban no Takaramono', 'file': 'http://50.7.54.34/ost/angel-beats-insert-song-album-keep-the-beats/wqbwyntmxg/09%20-%20Ichiban%20no%20Takaramono%20%20%28Yui%20ver.%29.mp3'},
    {'icon': iconImage, 'title': '[Angel Beats] LISA - My Song', 'file': 'http://50.7.54.34/ost/angel-beats-insert-song-album-keep-the-beats/iznrrfzxli/11%20-%20My%20Song%20%28Yui%20ver.%29.mp3'},
    {'icon': iconImage, 'title': '[Angel Beats] Gidemo - My Soil Your Beats', 'file': 'http://50.7.54.34/ost/angel-beats-insert-song-album-keep-the-beats/pcgbfeyvfa/12%20-%20My%20Soul%2C%20Your%20Beats%21%20%28Gidemo%20ver.%29.mp3'},
    {'icon': iconImage, 'title': '[Angel Beats] Gidemo - Brave Song', 'file': 'http://50.7.54.34/ost/angel-beats-insert-song-album-keep-the-beats/isozwltuny/13%20-%20Brave%20Song%20%28Gidemo%20ver.%29.mp3'},
    {'icon': iconImage, 'title': '[Anohana] Secret Base ~Kimi ga Kureta mono~', 'file': 'http://50.7.54.34/ost/ano-hi-mita-hana-no-namae-wo-bokutachi-wa-mada-shira-nai-ed-single-secret-base-kimi-ga-kureta-mono/rrwnsbsiks/01%20-%20Secret%20Base%20~Kimi%20ga%20Kureta%20mono~%20%2810%20years%20after%20Ver.%29.mp3'},
    {'icon': iconImage, 'title': '[Anohana] Galileo Galilei - Aoi Shiori', 'file': 'http://50.7.54.34/ost/ano-hi-mita-hana-no-namae-wo-bokutachi-wa-mada-shira-nai-op-single-aoi-shiori/fursbhmzif/01%20-%20Aoi%20Shiori.mp3'},
    {'icon': iconImage, 'title': '[Ao Haru Ride] FujiFabiric - Blue', 'file': 'http://50.7.54.34/ost/ao-haru-ride-ed-single-blue/wiogtvuhmu/01%20-%20Blue.mp3'},
    {'icon': iconImage, 'title': '[Ao Haru Ride] chico with honeyworks - Sekai wa Koi ni Ochiteiru', 'file': 'http://50.7.54.34/ost/ao-haru-ride-op-single-sekai-wa-koi-ni-ochiteiru/lewtxtikyx/01%20-%20Sekai%20wa%20Koi%20ni%20Ochiteiru.mp3'},
    {'icon': iconImage, 'title': '[Ao no Exorcist] 2pm - Take Off', 'file': 'http://50.7.54.34/ost/ao-no-exorcist-ed-single-take-off/uyhlindutf/01%20-%20Take%20off.mp3'},
    {'icon': iconImage, 'title': '[Ao no Exorcist] rookiez is punkd - Core Pride', 'file': 'http://50.7.54.34/ost/ao-no-exorcist-op-single-core-pride/rxpmpqjkto/01%20-%20CORE%20PRIDE.mp3'},
    {'icon': iconImage, 'title': '[Ao no Exorcist] rookiez is punkd - IN MY WORLD', 'file': 'http://50.7.54.34/ost/ao-no-exorcist-op2-single-in-my-world/xpqbeietgc/01%20-%20IN%20MY%20WORLD.mp3'},
    {'icon': iconImage, 'title': '[Ansatsu Kyoushitsu] 3-nen e-gumi utatan - Seishun Satsubatsuron', 'file': 'http://50.7.54.34/ost/assassination-classroom-op-single-seishun-satsubatsuron/kypulqohbf/01%20-%20Seishun%20Satsubatsuron.mp3'},
    {'icon': iconImage, 'title': '[Aoki Hagane no Arpeggio] Trident - Blue Field', 'file': 'http://50.7.54.34/ost/aoki-hagane-no-arpeggio-ars-nova-ed-single-blue-field/trdvvtfcjg/01%20-%20Blue%20Field.mp3'},
    {'icon': iconImage, 'title': '[Aoki Hagane no Arpeggio] Trident - Innocent Blue', 'file': 'http://50.7.54.34/ost/aoki-hagane-no-arpeggio-ars-nova-ed-single-blue-field/jkvsjkzrcd/02%20-%20Innocent%20Blue.mp3'},
    {'icon': iconImage, 'title': '[Ansatsu Kyoushitsu] 3-nen e-gumi utatan - Jiriki Hongan Revolution', 'file': 'http://50.7.54.34/ost/assassination-classroom-op2-single-jiriki-hongan-revolution/cinfcejtps/01%20-%20Jikiri%20Hongan%20Revolution.mp3'}];
            shuffle(tracks);

    AP.init({
      playList: tracks
    });

});
