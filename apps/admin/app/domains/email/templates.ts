// Templates pre-fill the HTML textarea in the EmailComposer.
// UNSUBSCRIBE_URL is left as a visible placeholder for the admin to replace.

const UNSUBSCRIBE_URL = 'https://api.sdarm.life/api/v1/unsubscribe?token=TOKEN';

const i18n = {
  de: {
    church: 'SDARM Germany Gemeinde',
    unsubscribeIntro: 'Sie erhalten diese E-Mail, weil Sie sich auf sdarm.life angemeldet haben.',
    unsubscribeLink: 'Abmelden',
    eyebrow: 'Neuigkeiten',
    heading: 'Es gibt Neuigkeiten',
    intro:
      'Wir haben neue Beiträge für Sie veröffentlicht. Wir hoffen, sie sind eine Quelle der Ermutigung und des Segens.',
    postTitle: 'Titel des Beitrags',
    postExcerpt: 'Kurze Beschreibung des Beitrags, die den Leser neugierig macht.',
    postLink: 'https://sdarm.life/de/posts/beispiel-beitrag',
    readMore: 'Weiterlesen →',
    cta: 'Alle Beiträge ansehen',
    ctaHref: 'https://sdarm.life/de',
  },
  en: {
    church: 'SDARM Germany Church',
    unsubscribeIntro: "You're receiving this because you subscribed at sdarm.life.",
    unsubscribeLink: 'Unsubscribe',
    eyebrow: 'Updates',
    heading: "We've got updates",
    intro: "We've published new posts for you. We hope they are a source of encouragement and blessing.",
    postTitle: 'Post title here',
    postExcerpt: 'A short excerpt that draws the reader in and gives a sense of what the post is about.',
    postLink: 'https://sdarm.life/en/posts/example-post',
    readMore: 'Read more →',
    cta: 'View all posts',
    ctaHref: 'https://sdarm.life/en',
  },
};

function layout(content: string, t: (typeof i18n)['de']): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark">
  <style>
    body { margin:0; padding:0; background:#0c0b09; -webkit-font-smoothing:antialiased; }
    @media only screen and (max-width:640px) {
      .ew { width:100% !important; }
      .ep { padding:28px 20px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#0c0b09;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0c0b09">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table class="ew" width="600" cellpadding="0" cellspacing="0" border="0"
               style="max-width:600px;width:600px;border:1px solid #1e1c17;border-radius:3px;overflow:hidden;">

          <!-- HEADER -->
          <tr>
            <td style="background:#0c0b09;padding:26px 40px;border-bottom:1px solid #1e1c17;">
              <a href="https://sdarm.life" style="text-decoration:none;">
                <span style="font-family:'Playfair Display',Georgia,serif;font-size:20px;font-weight:600;color:#d6d0c8;letter-spacing:3px;text-transform:uppercase;">SDARM</span><span style="font-family:'Playfair Display',Georgia,serif;font-size:20px;font-weight:600;color:#c9a96e;letter-spacing:3px;">.life</span>
              </a>
            </td>
          </tr>

          <!-- CONTENT -->
          <tr>
            <td class="ep" style="background:#0f0e0c;padding:44px 40px;">
              ${content}
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#0c0b09;padding:22px 40px;border-top:1px solid #1e1c17;text-align:center;">
              <p style="font-family:'Cormorant Garamond',Georgia,serif;font-size:13px;color:#7a7470;margin:0 0 4px;line-height:1.6;">
                ${t.church} &nbsp;&middot;&nbsp;
                <a href="https://sdarm.life" style="color:#7a7470;text-decoration:none;">sdarm.life</a>
              </p>
              <p style="font-family:'Cormorant Garamond',Georgia,serif;font-size:12px;color:#5a5450;margin:0;line-height:1.7;">
                ${t.unsubscribeIntro}<br>
                <a href="${UNSUBSCRIBE_URL}" style="color:#c9a96e;text-decoration:underline;">${t.unsubscribeLink}</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function postItem(t: (typeof i18n)['de'], post: { title: string; excerpt: string; link: string }): string {
  return `<tr>
    <td style="padding:0 0 28px 0;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="border-left:2px solid #c9a96e;padding-left:18px;">
            <a href="${post.link}" style="font-family:'Playfair Display',Georgia,serif;font-size:19px;font-weight:600;color:#d6d0c8;text-decoration:none;line-height:1.3;display:block;margin-bottom:8px;">${post.title}</a>
            <p style="font-family:'Cormorant Garamond',Georgia,serif;font-size:16px;color:#7a7470;margin:0 0 10px;line-height:1.65;">${post.excerpt}</p>
            <a href="${post.link}" style="font-family:Georgia,serif;font-size:11px;color:#c9a96e;text-decoration:none;text-transform:uppercase;letter-spacing:1.5px;">${t.readMore}</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

export type TemplateName = 'base' | 'updates';
export type Locale = 'de' | 'en';

export function getTemplate(name: TemplateName, locale: Locale): string {
  const t = i18n[locale];

  if (name === 'base') {
    const content = `<p style="font-family:'Cormorant Garamond',Georgia,serif;font-size:17px;color:#d6d0c8;margin:0;line-height:1.7;">
      Hier kommt Ihr Inhalt.
    </p>`;
    return layout(content, t);
  }

  // updates
  const posts = [
    { title: t.postTitle, excerpt: t.postExcerpt, link: t.postLink },
    { title: t.postTitle, excerpt: t.postExcerpt, link: t.postLink },
  ];

  const content = `
    <p style="font-family:Georgia,serif;font-size:11px;color:#c9a96e;letter-spacing:2px;text-transform:uppercase;margin:0 0 14px 0;">${t.eyebrow}</p>
    <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:30px;font-weight:600;color:#d6d0c8;margin:0 0 18px 0;line-height:1.2;">${t.heading}</h1>
    <p style="font-family:'Cormorant Garamond',Georgia,serif;font-size:17px;color:#7a7470;margin:0 0 36px 0;line-height:1.65;">${t.intro}</p>

    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:12px;">
      ${posts.map((p) => postItem(t, p)).join('')}
    </table>

    <table cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="background:#c9a96e;border-radius:2px;">
          <a href="${t.ctaHref}" style="font-family:Georgia,serif;font-size:11px;font-weight:600;color:#0c0b09;text-decoration:none;text-transform:uppercase;letter-spacing:2px;padding:13px 26px;display:block;">${t.cta}</a>
        </td>
      </tr>
    </table>`;

  return layout(content, t);
}
