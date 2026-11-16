# Dạo căn hộ 3D từ ảnh mặt bằng

Game three.js đi bộ góc nhìn thứ nhất trong căn hộ 2 phòng ngủ, dựng từ `reference/floorplan.png`.
Mọi kích thước tính bằng mét (1 đơn vị = 1 m).

## Chạy

```
npm install
npm run assets   # tải texture, HDRI, model CC0 từ Poly Haven (~41 MB) vào public/assets
npm run dev      # mở http://localhost:5173
npm run build    # xuất bản tĩnh ra dist/
node scripts/navtest.mjs   # kiểm tra mọi phòng đều đi tới được
```

Cần Node 18 trở lên (dùng Vite 5).

## Sửa căn hộ

Toàn bộ dữ liệu nằm trong `src/plan.js`, ghi bằng **pixel đo trên ảnh mặt bằng**:

- `PX_PER_M`: tỉ lệ. Hiện là 68 (ước lượng theo giường đôi dài 2.0 m). Có số đo thật thì chỉ sửa số này.
- `WALLS`: tường và lỗ mở (`door`, `open`, `window`, `balcony`).
- `ROOMS`: đa giác sàn từng phòng, loại sàn, độ sáng đèn.
- `FURNITURE`: nội thất, mỗi món có tâm, góc xoay, bề ngang, chiều sâu.
- `TOUR`: các điểm dừng của tour tự động.

Trong game, vào **Xem mô hình → Đối chiếu bản vẽ** để phủ ảnh gốc lên mô hình và kiểm tra tường có trùng không.

## Thay nội thất bằng model thật

Đặt file `.gltf`/`.glb` vào `public/assets/models/<tên>/`, thêm vào `models` trong `public/assets/manifest.json`,
rồi đổi món đó trong `FURNITURE` thành `F('glb', x, y, rot, w, d, { model: '<tên>' })`.
Model được tự co giãn cho vừa `w × d` (hoặc theo chiều cao `h` nếu có). Nếu model quay sai hướng, thêm góc hiệu chỉnh vào bảng `YAW` trong `src/furniture.js`.

## Cấu trúc

| File | Việc |
|---|---|
| `src/plan.js` | Dữ liệu mặt bằng |
| `src/walls.js`, `src/floors.js` | Tường, cửa, kính, lan can, sàn, trần, đèn |
| `src/furniture.js` | Nội thất tự dựng (bo góc) và nạp model GLB |
| `src/materials.js` | Vật liệu PBR từ texture Poly Haven |
| `src/lighting.js`, `src/post.js` | Trời HDRI, nắng, ánh sáng dội, AO, bloom, khử răng cưa |
| `src/nav.js` | Va chạm và tìm đường A* |
| `src/controls.js`, `src/hud.js`, `src/main.js` | Điều khiển, minimap, vòng lặp |

Tài nguyên từ [Poly Haven](https://polyhaven.com) theo giấy phép CC0.
