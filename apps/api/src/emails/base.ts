const FONT_IMPORT =
	"@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&display=swap');";

const i18n = {
	de: {
		unsubscribeIntro: 'Sie erhalten diese E-Mail, weil Sie sich auf sdarm.life angemeldet haben.',
		unsubscribeLink: 'Abmelden',
		church: 'SDARM Germany Gemeinde',
	},
	en: {
		unsubscribeIntro: "You're receiving this because you subscribed at sdarm.life.",
		unsubscribeLink: 'Unsubscribe',
		church: 'SDARM Germany Church',
	},
};

export function baseLayout(content: string, opts: { unsubscribeUrl: string; locale?: 'de' | 'en' }): string {
	const t = i18n[opts.locale ?? 'de'];

	return `<!DOCTYPE html>
<html lang="${opts.locale ?? 'de'}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark">
  <style>
    ${FONT_IMPORT}
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

          <!-- ── HEADER ── -->
          <tr>
            <td style="background:#0c0b09;padding:26px 40px;border-bottom:1px solid #1e1c17;">
              <a href="https://sdarm.life" style="text-decoration:none;">
                <span style="font-family:'Playfair Display',Georgia,serif;font-size:20px;font-weight:600;color:#d6d0c8;letter-spacing:3px;text-transform:uppercase;">SDARM</span><span style="font-family:'Playfair Display',Georgia,serif;font-size:20px;font-weight:600;color:#c9a96e;letter-spacing:3px;">.life</span>
              </a>
            </td>
          </tr>

          <!-- ── CONTENT ── -->
          <tr>
            <td class="ep" style="background:#0f0e0c;padding:44px 40px;">
              ${content}
            </td>
          </tr>

          <!-- ── FOOTER ── -->
          <tr>
            <td style="background:#0c0b09;padding:22px 40px;border-top:1px solid #1e1c17;text-align:center;">
              <p style="font-family:'Cormorant Garamond',Georgia,serif;font-size:13px;color:#7a7470;margin:0 0 4px;line-height:1.6;">
                ${t.church} &nbsp;&middot;&nbsp;
                <a href="https://sdarm.life" style="color:#7a7470;text-decoration:none;">sdarm.life</a>
              </p>
              <p style="font-family:'Cormorant Garamond',Georgia,serif;font-size:12px;color:#5a5450;margin:0;line-height:1.7;">
                ${t.unsubscribeIntro}<br>
                <a href="${opts.unsubscribeUrl}" style="color:#c9a96e;text-decoration:underline;">${t.unsubscribeLink}</a>
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
