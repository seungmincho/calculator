"""favicon PNG → favicon.ico, mstile-310x150 (로고 가운데). generate-icons.mjs 다음에 실행."""
from PIL import Image
imgs = [Image.open(f'public/favicon-{s}x{s}.png') for s in (16, 32, 48, 64)]
imgs[-1].save('public/favicon.ico', sizes=[(16, 16), (32, 32), (48, 48), (64, 64)], append_images=imgs[:-1])
tile = Image.new('RGBA', (310, 150), '#3182F6')
mark = Image.open('public/mstile-150x150.png').convert('RGBA')
tile.paste(mark, (80, 0), mark)
tile.save('public/mstile-310x150.png')
print('ok')
