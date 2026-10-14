with open('/var/www/kiritoshop/.env', 'r') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if line.startswith('DATABASE_URL='):
        new_lines.append('DATABASE_URL="postgresql://kiritoshop_user:KiritoShop2026SecurePass!@127.0.0.1:5432/kiritoshop_db?schema=public"\n')
    elif line.startswith('PORT='):
        new_lines.append('PORT=3000\n')
    else:
        new_lines.append(line)

with open('/var/www/kiritoshop/.env', 'w') as f:
    f.writelines(new_lines)

print("Updated /var/www/kiritoshop/.env successfully!")
