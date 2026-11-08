const defaultCookieConsent = { analytics: false, marketing: false };

function validateIdentifier(value, prefix) {
  if (typeof value !== "string" || !new RegExp("^" + prefix + "-[A-Z0-9]{1,32}$").test(value)) {
    throw new Error("Invalid public analytics identifier for " + prefix);
  }
}

export function buildGaBootstrap(GA_ID) {
  validateIdentifier(GA_ID, "G");
  return `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = window.gtag || gtag;
          function readConsent(){
            var consent = { analytics: ${defaultCookieConsent.analytics}, marketing: ${defaultCookieConsent.marketing} };
            try {
              var saved = window.localStorage.getItem('warrantee_cookie_consent');
              if (saved) {
                var parsed = JSON.parse(saved);
                consent.analytics = !!parsed.analytics;
                consent.marketing = !!parsed.marketing;
              }
            } catch (e) {}
            return consent;
          }
          function loadAnalytics(){
            var consent = readConsent();
            window.gtag('consent', window.__warranteeGaConsentSet ? 'update' : 'default', {
              analytics_storage: consent.analytics ? 'granted' : 'denied',
              ad_storage: consent.marketing ? 'granted' : 'denied',
              ad_user_data: consent.marketing ? 'granted' : 'denied',
              ad_personalization: consent.marketing ? 'granted' : 'denied',
            });
            window.__warranteeGaConsentSet = true;
            if (window.__warranteeGaLoaded || !consent.analytics) return;
            window.__warranteeGaLoaded = true;
            var script = document.createElement('script');
            script.async = true;
            script.src = 'https://www.googletagmanager.com/gtag/js?id=${GA_ID}';
            document.head.appendChild(script);
            gtag('js', new Date());
            gtag('config', '${GA_ID}', {
              page_title: document.title,
              page_location: window.location.href,
              send_page_view: true,
            });
          }
          window.warranteeLoadGoogleAnalytics = loadAnalytics;
          loadAnalytics();
          window.addEventListener('warrantee_cookie_consent_updated', loadAnalytics);
        `;
}

export function buildGtmBootstrap(GTM_ID) {
  validateIdentifier(GTM_ID, "GTM");
  return `(function(w,d,s,l,i){w[l]=w[l]||[];
        function gtag(){w[l].push(arguments);}
        w.gtag=w.gtag||gtag;
        function readConsent(){
          var consent={analytics:${defaultCookieConsent.analytics},marketing:${defaultCookieConsent.marketing}};
          try{
            var saved=w.localStorage.getItem('warrantee_cookie_consent');
            if(saved){
              var parsed=JSON.parse(saved);
              consent.analytics=!!parsed.analytics;
              consent.marketing=!!parsed.marketing;
            }
          }catch(e){}
          return consent;
        }
        function applyConsent(consent,mode){
          gtag('consent',mode||'default',{
            analytics_storage: consent.analytics ? 'granted' : 'denied',
            ad_storage: consent.marketing ? 'granted' : 'denied',
            ad_user_data: consent.marketing ? 'granted' : 'denied',
            ad_personalization: consent.marketing ? 'granted' : 'denied'
          });
        }
        function shouldLoad(consent){return !!(consent.analytics||consent.marketing);}
        function loadGtm(){
          var consent=readConsent();
          applyConsent(consent,w.__warranteeGtmConsentSet?'update':'default');
          w.__warranteeGtmConsentSet=true;
          if(w.__warranteeGtmLoaded||!shouldLoad(consent)) return;
          w.__warranteeGtmLoaded=true;
          w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
          var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
          j.async=true;
          j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
          f.parentNode.insertBefore(j,f);
        }
        w.warranteeLoadGtm=loadGtm;
        loadGtm();
        w.addEventListener('warrantee_cookie_consent_updated',loadGtm);
        })(window,document,'script','dataLayer','${GTM_ID}');`;
}
