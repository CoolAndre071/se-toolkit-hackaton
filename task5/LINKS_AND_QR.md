# Links and QR for Slide 5

## Final links

- GitHub repo:
  - https://github.com/CoolAndre071/se-toolkit-hackaton
- Deployed product:
  - <DEPLOYED_PRODUCT_URL>

## Quick QR links

Open in browser and save the generated PNG:

- Repo QR:
  - https://quickchart.io/qr?text=https%3A%2F%2Fgithub.com%2FCoolAndre071%2Fse-toolkit-hackaton

- Deploy QR template:
  - https://quickchart.io/qr?text=<URL_ENCODED_DEPLOYED_LINK>

## How to URL-encode deployed link

On your machine:

```bash
python3 - <<'PY'
import urllib.parse
url = "<DEPLOYED_PRODUCT_URL>"
print(urllib.parse.quote(url, safe=""))
PY
```

Put the printed value instead of `<URL_ENCODED_DEPLOYED_LINK>`.
