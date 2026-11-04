/* ---------------- NHU CẦU DINH DƯỠNG (V445–V446) ----------------
   Tách riêng từ khối "Hồ sơ bệnh nhân" của tab Xây dựng thực đơn: DÙNG LẠI đúng các hàm đang dùng ở đó
   (tinhNhuCau, canNangKeHoach, giaiDoanThanOf, tinhGoiYMucTieu, tinhKhuyenNghi…) — không có công thức thứ 2.
   Tab này chỉ hiện từng bước tính + cho nút "Áp dụng vào hồ sơ" (ghi mục tiêu, lưu mốc cũ vào lịch sử). */
let ncIn = null;          // bản sao hồ sơ đang tính (sửa ở đây KHÔNG đổi hồ sơ cho tới khi bấm Áp dụng)
let ncApXem = false;      // đang xem bảng xác nhận áp dụng
const NC_MACDINH_G = 55, NC_MACDINH_G_THAN = 58;  // %Glucid tạm dùng khi chưa nhập: 55% (tham chiếu chung 55–65%); có bệnh thận 58% (mẫu đạm thấp ≈58–60G : 9–10P : 30–33L)
function ncMacDinh(){
  return {ten:"", gioi_tinh:"nu", tuoi:30, can_nang_kg:55, chieu_cao_cm:158, muc_do_van_dong:"vua", muc_tap:"khong", tap_phut:0, tap_buoi:0,
    muc_tieu_can_nang:"giu", loai_can_nang_ke_hoach:"ly_tuong", he_so_hieu_chinh:0.25, giai_doan_benh:"chua_loc_may",
    benh_ly_kem:[], tinh_trang_dac_biet:[], xet_nghiem:{}};
}
function ncKhoiTao(){
  if(ncMode==="benhnhan"){
    const ds = bnMoiTruoc(state.benhnhan);
    let b = state.benhnhan.find(x=>x.id===ncBenhNhanId);
    if(!b && ds.length){ b = ds[0]; ncBenhNhanId = b.id; }
    ncIn = b ? JSON.parse(JSON.stringify(b)) : ncMacDinh();
    if(!ncIn.xet_nghiem) ncIn.xet_nghiem = {};
  } else ncIn = ncMacDinh();
  ncApXem = false;
}
/* V446: chế độ đối tượng — lưu chung ở hồ sơ trong tinh_trang_dac_biet ("tre_em" <10 tuổi, "cao_tuoi" ≥70 tuổi) */
const NC_TRE_EM_TUOI = 10, NC_CAO_TUOI_TUOI = 70;
function ncDoiTuongOf(p){ const t = (p && p.tinh_trang_dac_biet) || []; return t.includes("tre_em") ? "tre_em" : (t.includes("cao_tuoi") ? "cao_tuoi" : ""); }
/* RDA 2026 (Viện Dinh dưỡng, bảng B3 trong tài liệu dự án): kcal/ngày theo nhóm tuổi, giới, mức vận động — nhóm 65–74 và ≥75 */
const NC_RDA_NL_CAO_TUOI = {
  "65-74": {nam:{nhe:1885,vua:2210,nang:2535}, nu:{nhe:1550,vua:1820,nang:2090}},
  "75+":   {nam:{nhe:1810,vua:2130,nang:null}, nu:{nhe:1500,vua:1765,nang:null}}
};
function nhuCauChiTiet(p){
  const num = v => (v==null||v==="") ? null : (isNaN(parseFloat(v)) ? null : parseFloat(v));
  const f = x => String(round1(x));
  const gt = p.gioi_tinh==="nam" ? "nam" : "nu";
  const cn = num(p.can_nang_kg), cc = num(p.chieu_cao_cm), tuoi = num(p.tuoi), ib = num(p.bmr_inbody);
  const dt = ncDoiTuongOf(p), treEm = dt==="tre_em", caoTuoi = dt==="cao_tuoi";
  const S = [], out = {}, thieu = [];
  if(!(cn>0)) thieu.push("cân nặng");
  if(treEm){ if(!(cc>0)) thieu.push("chiều cao (để tính BMI)"); }
  else {
    if(!(cc>0)) thieu.push("chiều cao");
    if(!(tuoi>0) && !(ib>0)) thieu.push("tuổi (hoặc BMR InBody)");
  }
  const bmi = bmiOf(cn,cc), bl = bmiLabel(bmi);
  const ghiChuDoiTuong = [];
  if(treEm && tuoi>=NC_TRE_EM_TUOI) ghiChuDoiTuong.push({t:`Chế độ Trẻ em dành cho dưới ${NC_TRE_EM_TUOI} tuổi — hồ sơ này ${tuoi} tuổi, nên bỏ chọn chế độ.`, type:"warn"});
  if(caoTuoi && tuoi>0 && tuoi<NC_CAO_TUOI_TUOI) ghiChuDoiTuong.push({t:`Chế độ Người cao tuổi dành cho từ ${NC_CAO_TUOI_TUOI} tuổi — hồ sơ này ${tuoi} tuổi.`, type:"warn"});
  if(!dt && tuoi>0 && tuoi<NC_TRE_EM_TUOI) ghiChuDoiTuong.push({t:`Tuổi ${tuoi} (<${NC_TRE_EM_TUOI}): công thức người lớn không phù hợp — nên bấm chế độ "Trẻ em".`, type:"danger"});
  if(!dt && tuoi>=NC_CAO_TUOI_TUOI) ghiChuDoiTuong.push({t:`Tuổi ${tuoi} (≥${NC_CAO_TUOI_TUOI}): nên bấm chế độ "Người cao tuổi" để đối chiếu bảng RDA và nhắc nguy cơ mất khối cơ.`, type:"info"});
  // 1. BMI
  const s1 = {title:"Chỉ số nhân trắc (BMI)", rows:[
    ["BMI = cân nặng ÷ (chiều cao/100)²", (cn>0&&cc>0) ? `${f(cn)} ÷ (${f(cc)}/100)²` : "—", bmi!=null ? (treEm ? f(bmi) : `${f(bmi)} — ${bl.label}`) : "Thiếu dữ liệu", treEm?"neutral":bl.cls]], notes:ghiChuDoiTuong.slice()};
  if(treEm) s1.notes.push({t:"Trẻ em: không dùng ngưỡng BMI người lớn. Đánh giá tăng trưởng theo Z-score WHO 2007 (cân nặng/tuổi, chiều cao/tuổi, BMI/tuổi) — tra bảng WHO theo tháng tuổi và giới.", type:"info"});
  S.push(s1);
  // 2. Cân nặng
  const bmiLt = bmiMucTieuMacDinh(gt);
  const ibw = cc>0 ? bmiLt*Math.pow(cc/100,2) : null;
  const hs = (p.he_so_hieu_chinh>0 && p.he_so_hieu_chinh<=1) ? +p.he_so_hieu_chinh : 0.25;
  const loai = treEm ? "hien_tai" : (p.loai_can_nang_ke_hoach || "ly_tuong");
  const cnKh = canNangKeHoach(loai, gt, cc, cn, hs);
  const hc = (ibw!=null && cn>0) ? ibw + hs*(cn-ibw) : null;
  let s2;
  if(treEm){
    s2 = {title:"Cân nặng dùng cho kế hoạch", rows:[["Trẻ em dùng cân nặng thực tế (không dùng BMI lý tưởng 21/22 của người lớn)", "", cn>0 ? f(cn)+" kg" : "—", "ok"]], notes:[]};
  } else {
    s2 = {title:"Cân nặng dùng cho kế hoạch (tính đạm g/kg)", rows:[
      [`Cân nặng lý tưởng = BMI ${bmiLt} (${gt==="nam"?"nam":"nữ"}) × (chiều cao/100)²`, ibw!=null ? `${bmiLt} × ${(cc/100).toFixed(2)}²` : "—", ibw!=null ? f(ibw)+" kg" : "—"],
      [`Cân nặng hiệu chỉnh = lý tưởng + ${hs} × (hiện tại − lý tưởng)`, hc!=null ? `${f(ibw)} + ${hs} × (${f(cn)} − ${f(ibw)})` : "—", hc!=null ? f(hc)+" kg" : "—"],
      ["Cân nặng hiện tại", "số đã nhập ở trên", cn>0 ? f(cn)+" kg" : "—"],
      [`Loại được chọn cho kế hoạch: ${LOAI_CAN_KH[loai]||loai}`, "", cnKh!=null ? f(cnKh)+" kg" : "—", "ok"]], notes:[]};
    if(ibw && cn>0 && cn<0.95*ibw && loai!=="ly_tuong") s2.notes.push({t:`Thiếu cân (${Math.round(cn/ibw*100)}% cân nặng lý tưởng): nên chọn cân nặng lý tưởng để hồi phục.`, type:"warn"});
  }
  S.push(s2);
  // 3. Năng lượng
  const mtc = treEm ? MUC_TIEU_CAN.giu : (MUC_TIEU_CAN[p.muc_tieu_can_nang] || MUC_TIEU_CAN.giu);
  let nc = null, eMt = null;
  const pal = PAL[p.muc_do_van_dong||"vua"]||PAL.vua;
  if(treEm){
    let e = null, ct = "";
    if(cn>20){ e = 1500+20*(cn-20); ct = `1500 + 20 × (${f(cn)} − 20)`; }
    else if(cn>=10){ e = 1000+50*(cn-10); ct = `1000 + 50 × (${f(cn)} − 10)`; }
    const s3 = {title:"Năng lượng khuyến nghị (trẻ em — công thức tính nhanh theo cân nặng)", rows:[
      [cn>20 ? "NCNL = 1500 + 20 × (cân nặng − 20), áp dụng khi >20 kg" : "NCNL = 1000 + 50 × (cân nặng − 10), áp dụng khi 10–20 kg", e!=null ? ct : "—", e!=null ? Math.round(e)+" kcal/ngày" : (cn>0?"dưới 10 kg: chưa có công thức":"—"), e!=null?"ok":"neutral"]], notes:[
      {t:"Công thức tính nhanh chỉ để ước tính. Trẻ có bệnh lý, suy dinh dưỡng hoặc thừa cân: ưu tiên bảng RDA theo tuổi và giới (Viện Dinh dưỡng 2026), không cắt giảm năng lượng đột ngột vì trẻ còn tăng trưởng.", type:"info"}]};
    if(p.muc_tieu_can_nang && p.muc_tieu_can_nang!=="giu") s3.notes.push({t:"Trẻ em: bỏ qua mục tiêu giảm/tăng cân ±300–500 kcal của người lớn (đang tính theo giữ cân).", type:"warn"});
    S.push(s3);
    if(e!=null){ eMt = Math.round(e); nc = {bmr:null, energy:e}; }
  } else {
    const tapK = tapKcalNgay(p.muc_tap, p.tap_phut, p.tap_buoi);
    nc = (cn>0 && ((cc>0 && tuoi>0) || ib>0)) ? tinhNhuCau({gioiTinh:gt,canNang:cn,chieuCao:cc,tuoi:tuoi,mucDo:p.muc_do_van_dong||"vua",bmrInbody:ib,tapKcal:tapK}) : null;
    const hbText = gt==="nam" ? `88,362 + 13,397×${f(cn||0)} + 4,799×${f(cc||0)} − 5,677×${f(tuoi||0)}` : `447,593 + 9,247×${f(cn||0)} + 3,098×${f(cc||0)} − 4,330×${f(tuoi||0)}`;
    S.push({title:"Năng lượng cơ bản (BMR)", rows:[
      ib>0 ? ["BMR đo bằng InBody (dùng thay công thức)", "số đã nhập ở trên", f(ib)+" kcal/ngày"]
           : [`BMR — công thức Harris-Benedict hiệu chỉnh (${gt==="nam"?"nam":"nữ"})`, hbText, nc ? f(nc.bmr)+" kcal/ngày" : "—"]]});
    S.push({title:"Hệ số mức độ vận động / lao động", rows:[[pal.label.split(" (")[0]+" — "+pal.vd, "", "× "+pal.v]]});
    const mt = MUC_TAP[p.muc_tap||"khong"]||MUC_TAP.khong;
    const s5 = {title:"Năng lượng tập luyện", rows:[
      [`${mt.label}`+(mt.kcalGio>0?` × ${num(p.tap_phut)||0} phút/buổi ÷ 60 × ${num(p.tap_buoi)>0?num(p.tap_buoi):7}/7 buổi mỗi tuần`:""), mt.kcalGio>0 ? `${mt.kcalGio} × (${num(p.tap_phut)||0}/60) × (${Math.min(num(p.tap_buoi)>0?num(p.tap_buoi):7,7)}/7)` : "không tập", "+"+Math.round(tapK)+" kcal/ngày"]], notes:[]};
    { const lt = loiTapChiTiet(p.muc_tap, p.tap_phut, p.tap_buoi); if(lt.text) s5.notes.push({t:lt.text, type:"danger"}); }
    S.push(s5);
    S.push({title:"Tổng năng lượng tiêu hao (TDEE)", rows:[["TDEE = BMR × hệ số vận động + năng lượng tập luyện", nc ? `${f(nc.bmr)} × ${pal.v} + ${Math.round(tapK)}` : "—", nc ? f(nc.energy)+" kcal/ngày" : "Thiếu "+thieu.join(", ")]]});
    eMt = nc ? Math.round(nc.energy + mtc.delta) : null;
    const s7 = {title:"Năng lượng mục tiêu (theo mục tiêu cân nặng)", rows:[[`${mtc.label}: TDEE ${mtc.delta>=0?"+":"−"} ${Math.abs(mtc.delta)}`, nc ? `${f(nc.energy)} ${mtc.delta>=0?"+":"−"} ${Math.abs(mtc.delta)}` : "—", eMt!=null ? eMt+" kcal/ngày" : "—", "ok"]], notes:[]};
    if(eMt!=null && nc && eMt<nc.bmr) s7.notes.push({t:`Năng lượng mục tiêu thấp hơn BMR (${f(nc.bmr)} kcal) — chuyên gia xem lại mức giảm cân.`, type:"warn"});
    if(caoTuoi && mtc.delta<0) s7.notes.push({t:"Người cao tuổi: giảm cân dễ kéo theo mất khối cơ — chỉ giảm khi thật cần, ưu tiên mức nhẹ và đủ đạm.", type:"warn"});
    S.push(s7);
    // Người cao tuổi: đối chiếu RDA 2026
    if(caoTuoi && tuoi>0){
      const band = tuoi>=75 ? "75+" : "65-74", rda = NC_RDA_NL_CAO_TUOI[band][gt][p.muc_do_van_dong||"vua"];
      const sR = {title:`Đối chiếu RDA 2026 — ${gt==="nam"?"nam":"nữ"} ${band==="75+"?"≥75":"65–74"} tuổi`, rows:[], notes:[]};
      if(rda && eMt!=null){
        const lech = Math.round((eMt-rda)/rda*100);
        sR.rows.push([`RDA năng lượng, mức vận động "${pal.label.split(" (")[0]}"`, "bảng RDA Viện Dinh dưỡng 2026", rda+" kcal/ngày"]);
        sR.rows.push(["Năng lượng mục tiêu so với RDA", `${eMt} so với ${rda}`, (lech>=0?"+":"")+lech+"%", Math.abs(lech)>15?"warn":"ok"]);
        if(Math.abs(lech)>15) sR.notes.push({t:"Lệch trên 15% so với RDA cùng nhóm tuổi — chuyên gia xem lại mức vận động hoặc số cân nặng đã nhập.", type:"warn"});
      } else sR.rows.push(["RDA năng lượng", "", rda ? "chưa đủ dữ liệu" : "bảng RDA không có mức vận động nặng cho ≥75 tuổi"]);
      S.push(sR);
    }
  }
  if(eMt!=null) out.target_energy = eMt;
  // Đạm
  const stage = treEm ? null : giaiDoanThanOf(p);
  const locMau = p.giai_doan_benh==="loc_may_ctnt" || p.giai_doan_benh==="loc_mang_bung";
  const gkgNhap = num(p.dam_gkg)>0 ? num(p.dam_gkg) : null;
  const gkgRda = (caoTuoi && !stage && !locMau) ? 0.93 : null;
  const gkg = gkgNhap!=null ? gkgNhap : (stage ? (stage.protein[0]+stage.protein[1])/2 : gkgRda);
  const s8 = {title:"Protein (đạm) theo bệnh lý & giai đoạn", rows:[], notes:[]};
  if(treEm){
    s8.notes.push({t:"Trẻ em: không áp khoảng đạm KDOQI của người lớn. Chưa có bảng đạm g/kg theo tuổi của trẻ trong tài liệu dự án — nhập Đạm g/kg theo bảng RDA/chỉ định (trẻ bệnh thận: dùng tài liệu 'Dinh dưỡng bệnh thận trẻ em', protid theo tuổi và giai đoạn GFR).", type:"info"});
    const ti = tuoi>=6 ? (tuoi<10?"6–9 tuổi: đạm động vật : thực vật khoảng 1 : 1":"") : (tuoi>0 ? "dưới 6 tuổi: đạm động vật : thực vật khoảng 2 : 1 (tài liệu ghi '>6 tuổi', cần xác nhận)":"");
    if(ti) s8.notes.push({t:"Tỉ lệ đạm theo tuổi — "+ti+".", type:"info"});
  } else if(stage) s8.rows.push([`${stage.chon?"Giai đoạn đã chọn":"Giai đoạn theo GFR "+(p.xet_nghiem&&p.xet_nghiem.gfr)}: ${stage.label}`, "KDOQI, chưa lọc máu", `${stage.protein[0]}–${stage.protein[1]} g/kg cân nặng/ngày`]);
  else if(locMau) s8.notes.push({t:"Đang lọc máu: app chưa có bộ nguyên tắc đạm riêng cho giai đoạn này — nhập Đạm g/kg do bác sĩ/chuyên gia chỉ định (tài liệu tham khảo 1,0–1,2 g/kg, cần bác sĩ xác nhận).", type:"warn"});
  else {
    s8.rows.push(["Chưa có giai đoạn bệnh thận / GFR", "", "không áp dụng khoảng KDOQI"]);
    if(caoTuoi) s8.notes.push({t:"Người cao tuổi chưa có bệnh thận: dùng RDA 2026 = 0,93 g/kg/ngày (15–20% năng lượng với người ≥50 tuổi). Không hạ đạm thấp hơn mức cần thiết khi chưa cân đối với giai đoạn GFR.", type:"info"});
    else if(eMt) s8.notes.push({t:`Người không bệnh thận: tham khảo 15–20% năng lượng ≈ ${Math.round(eMt*0.15/4)}–${Math.round(eMt*0.20/4)} g/ngày. Nhập Đạm g/kg theo chỉ định của chuyên gia ở ô bên trên.`, type:"info"});
  }
  if(gkg!=null){
    s8.rows.push([gkgNhap!=null ? "Đạm g/kg — chuyên gia đã nhập" : (stage ? "Đạm g/kg — trung điểm khoảng khuyến nghị" : "Đạm g/kg — RDA 2026 người cao tuổi"), stage&&gkgNhap==null ? `(${stage.protein[0]} + ${stage.protein[1]}) ÷ 2` : "", gkg+" g/kg"]);
    if(gkgNhap!=null && stage && (gkgNhap<stage.protein[0]-1e-9 || gkgNhap>stage.protein[1]+1e-9)) s8.notes.push({t:`Đạm ${gkgNhap} g/kg nằm ngoài khoảng khuyến nghị ${stage.protein[0]}–${stage.protein[1]} của giai đoạn này.`, type:"warn"});
  }
  const protG = (gkg!=null && cnKh!=null) ? round1(gkg*cnKh) : null;
  if(protG!=null){ s8.rows.push(["Protein (g) = đạm g/kg × cân nặng kế hoạch", `${gkg} × ${f(cnKh)}`, protG+" g/ngày", "ok"]); out.dam_gkg = gkg; out.target_protein = protG; }
  S.push(s8);
  // G:P:L
  const gTam = (stage||locMau) ? NC_MACDINH_G_THAN : NC_MACDINH_G;
  const gIn = num(p.ty_le_glucid), gDung = gIn!=null ? gIn : gTam;
  const s9 = {title:"Phân bổ năng lượng Glucid : Protein : Lipid", rows:[], notes:[]};
  if(eMt && protG!=null){
    const tylep = round1(protG*4/eMt*100), tylel = round1(100-gDung-tylep);
    const carbG = round1(eMt*gDung/100/4), lipG = round1(eMt*tylel/100/9);
    s9.rows.push(["% Protein = protein(g) × 4 ÷ năng lượng", `${protG} × 4 ÷ ${eMt}`, tylep+"%"]);
    s9.rows.push([gIn!=null ? "% Glucid — chuyên gia nhập" : `% Glucid — chưa nhập, tạm dùng ${gTam}%`, "", gDung+"%"]);
    s9.rows.push(["% Lipid = 100 − %Glucid − %Protein", `100 − ${gDung} − ${tylep}`, tylel+"%"]);
    s9.rows.push(["Glucid (g) = năng lượng × %G ÷ 4", `${eMt} × ${gDung}% ÷ 4`, carbG+" g/ngày", "ok"]);
    s9.rows.push(["Lipid (g) = năng lượng × %L ÷ 9", `${eMt} × ${tylel}% ÷ 9`, lipG+" g/ngày", "ok"]);
    if(tylel<0) s9.notes.push({t:"%Glucid + %Protein vượt 100% — giảm %Glucid hoặc đạm g/kg.", type:"danger"});
    else if(tylel<15 || tylel>35) s9.notes.push({t:`%Lipid ${tylel}% khá lệch (thường 20–35%) — kiểm tra lại %Glucid.`, type:"warn"});
    if(caoTuoi && !stage && !locMau && tylep<13) s9.notes.push({t:`%Protein ${tylep}% thấp hơn khoảng 13–20% năng lượng của RDA (15–20% với người ≥50 tuổi) — cân nhắc tăng Đạm g/kg nếu không có chỉ định hạn chế đạm.`, type:"warn"});
    s9.notes.push({t:"Tham chiếu chung người khoẻ mạnh: Glucid 55–65% · Protein 15–20% · Lipid 20–25%. Chế độ đạm thấp (bệnh thận) có %Protein thấp hơn là bình thường.", type:"info"});
    Object.assign(out, {ty_le_glucid:gDung, ty_le_protein:tylep, ty_le_lipid:tylel, target_carb:carbG, target_lipid:lipG});
    out._gMacDinh = gIn==null ? gTam : 0;
  } else s9.rows.push([treEm ? "Cần năng lượng và Đạm g/kg (nhập ở ô bên trên)" : "Cần có năng lượng mục tiêu và protein (g) ở các bước trên", "", "—"]);
  S.push(s9);
  // Natri / Kali / nước
  const goiY = tinhGoiYMucTieu(p);
  const s10 = {title:"Natri, Kali, nước"+(caoTuoi?", chất xơ, canxi":""), rows:[], notes:[]};
  s10.rows.push(["Natri mục tiêu", goiY.natri_target ? "THA hoặc Natri máu ngoài ngưỡng" : "không có chỉ định siết riêng", goiY.natri_target ? "≤ "+goiY.natri_target+" mg/ngày" : "giữ giá trị hồ sơ", goiY.natri_target?"warn":"neutral"]);
  s10.rows.push(["Trần Kali", goiY.kali_ceiling ? `Kali máu > ${NGUONG_XN.k_mau.max}` : "Kali máu không cao", goiY.kali_ceiling ? "< "+goiY.kali_ceiling+" mg/ngày" : "giữ giá trị hồ sơ", goiY.kali_ceiling?"warn":"neutral"]);
  if(treEm && cn>0){
    const ml = Math.min(cn,10)*100 + Math.max(Math.min(cn,20)-10,0)*50 + Math.max(cn-20,0)*20;
    s10.rows.push(["Nước trẻ em = 10 kg đầu × 100 ml + 10 kg kế × 50 ml + kg còn lại × 20 ml", `${Math.min(cn,10)}×100 + ${Math.max(Math.min(cn,20)-10,0)}×50 + ${f(Math.max(cn-20,0))}×20`, Math.round(ml)+" ml/ngày"]);
  } else if(cn>0) s10.rows.push(["Nước tham khảo = 30–35 ml × cân nặng hiện tại", `30–35 × ${f(cn)}`, `${Math.round(cn*30)}–${Math.round(cn*35)} ml/ngày`]);
  if(caoTuoi && !stage && !locMau){
    s10.rows.push(["Chất xơ (≥65 tuổi)", gt==="nam"?"nam":"nữ", gt==="nam" ? "> 20 g/ngày" : "> 17 g/ngày"]);
    s10.rows.push(["Canxi / Phospho (≥65 tuổi, không bệnh thận)", "RDA / AI 2026", "800–1000 mg/ngày mỗi chất"]);
  }
  if(!treEm && (locMau || (stage && stage.stage!=="G1" && stage.stage!=="G2"))) s10.notes.push({t:"Bệnh thận từ G3: lượng nước theo chỉ định của bác sĩ (theo nước tiểu, phù, lọc máu) — con số trên chỉ để tham khảo.", type:"info"});
  if(caoTuoi) s10.notes.push({t:"Người cao tuổi: lưu ý nguy cơ mất nước, ăn kém, khó nhai/nuốt — ưu tiên món mềm, chia nhỏ bữa.", type:"info"});
  if(goiY.natri_target) out.natri_target = goiY.natri_target;
  if(goiY.kali_ceiling) out.kali_ceiling = goiY.kali_ceiling;
  S.push(s10);
  S.forEach((s,i)=>{ s.no = i+1; });
  return {steps:S, out, thieu, nc, cnKh, stage, dt};
}
function ncXnDanhGia(p){
  const xn = p.xet_nghiem||{}, g = p.gioi_tinh==="nam"?"nam":"nu", N = NGUONG_XN;
  const num = v => (v==null||v==="") ? null : parseFloat(v);
  const rows = [];
  const add = (ten, v, unit, ref, st, nhan)=>{ if(v!=null && !isNaN(v)) rows.push({ten, v, unit, ref, st, nhan}); };
  let v;
  if((v=num(xn.gfr))!=null){ const s=gfrStage(v); add("GFR", v, "mL/ph/1.73m²", "≥90 bình thường", s&&(s.stage==="G1")?"ok":(s&&(s.stage==="G2"||s.stage==="G3a")?"warn":"danger"), s?s.label:""); }
  if((v=num(xn.k_mau))!=null) add(N.k_mau.ten, v, N.k_mau.unit, `${N.k_mau.min}–${N.k_mau.max}`, v>N.k_mau.max?"danger":(v<N.k_mau.min?"warn":"ok"), v>N.k_mau.max?"Cao":(v<N.k_mau.min?"Thấp":"Bình thường"));
  if((v=num(xn.na_mau))!=null) add(N.na_mau.ten, v, N.na_mau.unit, `${N.na_mau.min}–${N.na_mau.max}`, (v<N.na_mau.min||v>N.na_mau.max)?"warn":"ok", v<N.na_mau.min?"Thấp":(v>N.na_mau.max?"Cao":"Bình thường"));
  if((v=num(xn.phospho))!=null) add(N.phospho.ten, v, N.phospho.unit, `${N.phospho.min}–${N.phospho.max}`, v>N.phospho.max?"warn":"ok", v>N.phospho.max?"Cao":(v<N.phospho.min?"Thấp":"Bình thường"));
  if((v=num(xn.ure))!=null) add(N.ure.ten, v, N.ure.unit, `${N.ure.min}–${N.ure.max}`, v>N.ure.max?"warn":"ok", v>N.ure.max?"Cao":"Bình thường");
  if((v=num(xn.acid_uric))!=null){ const r=N.acid_uric.theoGioi[g]; add(N.acid_uric.ten, v, N.acid_uric.unit, `${r[0]}–${r[1]}`, v>r[1]?"warn":"ok", v>r[1]?"Cao":"Bình thường"); }
  if((v=num(xn.hb))!=null){ const r=N.hb.theoGioi[g]; add(N.hb.ten, v, N.hb.unit, `${r[0]}–${r[1]}`, v<r[0]?"warn":"ok", v<r[0]?"Thấp":"Bình thường"); }
  if((v=num(xn.hba1c))!=null) add(N.hba1c.ten, v, N.hba1c.unit, "< 5,7", v>=6.5?"danger":(v>=5.7?"warn":"ok"), v>=6.5?"Mức đái tháo đường":(v>=5.7?"Tiền đái tháo đường":"Bình thường"));
  if((v=num(xn.glucose))!=null) add(N.glucose.ten, v, N.glucose.unit, `${N.glucose.min}–${N.glucose.max}`, v>N.glucose.max?"warn":"ok", v>N.glucose.max?"Cao":"Bình thường");
  if((v=num(xn.tg))!=null) add(N.tg.ten, v, N.tg.unit, `< ${N.tg.max}`, v>N.tg.max?"warn":"ok", v>N.tg.max?"Cao":"Bình thường");
  if((v=num(xn.ldl))!=null) add(N.ldl.ten, v, N.ldl.unit, `< ${N.ldl.max}`, v>N.ldl.max?"warn":"ok", v>N.ldl.max?"Cao":"Tối ưu");
  if((v=num(xn.ac_nieu))!=null) add(N.ac_nieu.ten, v, N.ac_nieu.unit, `< ${N.ac_nieu.a1}`, v>N.ac_nieu.a2?"danger":(v>N.ac_nieu.a1?"warn":"ok"), v>N.ac_nieu.a2?"Đại đạm niệu":(v>N.ac_nieu.a1?"Vi đạm niệu":"Bình thường"));
  return rows;
}
const NC_XN_TRUONG = [["gfr","GFR (mL/ph/1.73m²)","0.1"],["k_mau","Kali máu (mmol/L)","0.01"],["na_mau","Natri máu (mmol/L)","0.1"],["phospho","Phospho máu (mg/dL)","0.1"],["ure","Ure huyết (mmol/L)","0.1"],["acid_uric","Acid uric (mg/dL)","0.1"],["hb","Hemoglobin (g/dL)","0.1"],["hba1c","HbA1c (%)","0.1"],["glucose","Glucose lúc đói (mg/dL)","1"],["tg","Triglyceride (mg/dL)","1"],["ldl","LDL-Cholesterol (mg/dL)","1"],["ac_nieu","A/C niệu (mg/g)","1"]];
const NC_KEY_SO_SANH = ["gioi_tinh","tuoi","can_nang_kg","chieu_cao_cm","giai_doan_benh","thuoc_dang_dung"];
function ncKhacHoSo(){
  if(ncMode!=="benhnhan") return ["chế độ nhập thủ công"];
  const b = state.benhnhan.find(x=>x.id===ncBenhNhanId); if(!b) return ["không tìm thấy hồ sơ"];
  const nor = v => (v==null||v==="") ? "" : String(v);
  const kh = [];
  NC_KEY_SO_SANH.forEach(k=>{ if(nor(b[k])!==nor(ncIn[k])) kh.push(k); });
  if(JSON.stringify((b.benh_ly_kem||[]).slice().sort())!==JSON.stringify((ncIn.benh_ly_kem||[]).slice().sort())) kh.push("benh_ly_kem");
  NC_XN_TRUONG.forEach(([k])=>{ if(nor((b.xet_nghiem||{})[k])!==nor((ncIn.xet_nghiem||{})[k])) kh.push("xn_"+k); });
  return kh;
}
const NC_AP_TRUONG = [["target_energy","Năng lượng (kcal)"],["dam_gkg","Đạm (g/kg)"],["target_protein","Protein (g)"],["ty_le_glucid","% Glucid"],["ty_le_protein","% Protein"],["ty_le_lipid","% Lipid"],["target_carb","Glucid (g)"],["target_lipid","Lipid (g)"],["natri_target","Natri (mg)"],["kali_ceiling","Trần Kali (mg)"]];
const NC_AP_CAIDAT = ["tinh_trang_dac_biet","muc_tieu_can_nang","loai_can_nang_ke_hoach","he_so_hieu_chinh","muc_do_van_dong","muc_tap","tap_phut","tap_buoi","bmr_inbody"];
function ncRenderKetQua(){
  const r = nhuCauChiTiet(ncIn);
  const pill = (c,t)=>`<span class="pill ${c||'neutral'}">${t}</span>`;
  let html = "";
  if(r.thieu.length) html += `<div class="banner warn" style="margin-bottom:10px;">Còn thiếu: ${r.thieu.join(", ")} — các bước phụ thuộc chưa tính được.</div>`;
  html += r.steps.map(s=>`<div class="card" style="margin-top:10px;padding:12px 14px;">
    <div style="font-weight:600;margin-bottom:6px;">Bước ${s.no}. ${esc(s.title)}</div>
    <div class="tblwrap"><table><thead><tr><th>Nội dung</th><th>Cách tính</th><th class="num">Kết quả</th></tr></thead><tbody>
    ${s.rows.map(x=>`<tr><td>${esc(x[0])}</td><td class="hint">${esc(x[1]||"")}</td><td class="num">${x[3]?pill(x[3],esc(x[2])):`<b>${esc(x[2])}</b>`}</td></tr>`).join("")}
    </tbody></table></div>
    ${(s.notes||[]).map(n=>`<div class="banner ${n.type==='neutral'?'info':n.type}" style="margin-top:8px;">${esc(n.t)}</div>`).join("")}
  </div>`).join("");
  // 11. Chỉ số bệnh lý
  const xr = ncXnDanhGia(ncIn);
  html += `<div class="card" style="margin-top:10px;padding:12px 14px;"><div style="font-weight:600;margin-bottom:6px;">Bước ${r.steps.length+1}. Đánh giá chỉ số xét nghiệm / bệnh lý</div>`;
  html += xr.length ? `<div class="tblwrap"><table><thead><tr><th>Chỉ số</th><th class="num">Kết quả</th><th>Ngưỡng tham khảo</th><th>Đánh giá</th></tr></thead><tbody>${xr.map(x=>`<tr><td>${esc(x.ten)}</td><td class="num">${x.v} <span class="hint">${esc(x.unit)}</span></td><td>${esc(x.ref)}</td><td>${pill(x.st,esc(x.nhan))}</td></tr>`).join("")}</tbody></table></div>` : `<div class="hint">Chưa nhập chỉ số xét nghiệm (mục "Chỉ số xét nghiệm" ở trên).</div>`;
  html += `<div style="margin-top:8px;">${renderKhuyenNghiList(tinhKhuyenNghi(ncIn))}</div></div>`;
  // 12. Áp dụng
  const o = r.out;
  html += `<div class="card" style="margin-top:10px;padding:12px 14px;"><div style="font-weight:600;margin-bottom:6px;">Bước ${r.steps.length+2}. Áp dụng vào hồ sơ bệnh nhân</div>`;
  if(ncMode!=="benhnhan") html += `<div class="hint">Đang ở chế độ nhập thủ công — chọn "Theo bệnh nhân đã lưu" để ghi kết quả vào hồ sơ.</div>`;
  else if(o.target_energy==null) html += `<div class="hint">Chưa đủ dữ liệu để tạo mục tiêu.</div>`;
  else {
    const kh = ncKhacHoSo();
    if(kh.length){
      html += `<div class="banner warn">Các chỉ số đang nhập khác hồ sơ (${kh.length} mục: cân nặng, chiều cao, giai đoạn, xét nghiệm…). Nút Áp dụng chỉ ghi mục tiêu, không ghi các chỉ số này — hãy cập nhật chúng ở tab Hồ sơ bệnh nhân trước, hoặc lấy lại số từ hồ sơ.</div>
      <div class="row" style="margin-top:8px;"><button class="btn secondary sm" id="btn-nc-laylai">Lấy lại số liệu từ hồ sơ</button></div>`;
    } else if(!ncApXem){
      html += `<div class="row"><button class="btn sm" id="btn-nc-apdung">Áp dụng vào hồ sơ</button></div><p class="hint" style="margin:6px 0 0;">Sẽ cho xem bảng so sánh số cũ – số mới trước khi ghi; số mục tiêu cũ được lưu vào lịch sử mục tiêu.</p>`;
    } else {
      const b = state.benhnhan.find(x=>x.id===ncBenhNhanId)||{};
      const rowsAp = NC_AP_TRUONG.filter(([k])=>o[k]!=null).map(([k,l])=>`<tr><td>${l}</td><td class="num">${b[k]!=null&&b[k]!==""?b[k]:"—"}</td><td class="num"><b>${o[k]}</b></td></tr>`).join("");
      html += `<div class="tblwrap"><table><thead><tr><th>Mục tiêu</th><th class="num">Hồ sơ hiện tại</th><th class="num">Sẽ ghi</th></tr></thead><tbody>${rowsAp}</tbody></table></div>
      ${o._gMacDinh?`<div class="banner warn" style="margin-top:8px;">%Glucid chưa nhập nên đang tạm dùng ${o._gMacDinh}% — nhập %Glucid ở ô bên trên nếu muốn số khác.</div>`:""}
      <p class="hint" style="margin:6px 0 0;">Cũng ghi các thiết lập kế hoạch đang chọn: chế độ đối tượng (trẻ em / người cao tuổi), mục tiêu cân nặng, loại cân nặng kế hoạch, mức vận động, tập luyện, BMR InBody.</p>
      <div class="row" style="margin-top:8px;"><button class="btn sm" id="btn-nc-xacnhan">Xác nhận ghi vào hồ sơ</button><button class="btn ghost sm" id="btn-nc-huy">Huỷ</button></div>`;
    }
  }
  html += `</div>`;
  return html;
}
function renderNhuCau(){
  if(!ncIn) ncKhoiTao();
  const bnOptions = bnMoiTruoc(state.benhnhan).map(b=>`<option value="${b.id}" ${b.id===ncBenhNhanId?"selected":""}>${esc(b.ten)}</option>`).join("");
  const p = ncIn;
  const I = (field,label,type,extra)=>`<label>${label}<input data-nc-f="${field}" type="${type||"number"}" ${extra||""} value="${p[field]==null?"":esc(String(p[field]))}"></label>`;
  const sel = (field,label,opts,cls)=>`<label>${label}<select data-nc-f="${field}" ${cls?`class="${cls}"`:""}>${opts}</select></label>`;
  const optsOf = (obj, cur, lab)=>Object.entries(obj).map(([k,v])=>`<option value="${k}" ${cur===k?"selected":""}>${esc(lab?lab(v):v)}</option>`).join("");
  const chk = (field,map)=>Object.entries(map).map(([k,label])=>`<label class="checkfield"><input type="checkbox" data-nc-chk="${field}" value="${k}" ${(p[field]||[]).includes(k)?"checked":""}> ${esc(label)}</label>`).join("");
  return `<div class="card">
    <div class="row" style="margin-bottom:12px;">
      <button class="btn ${ncMode==='benhnhan'?'':'secondary'} sm" data-nc-mode="benhnhan">Theo bệnh nhân đã lưu</button>
      <button class="btn ${ncMode==='manual'?'':'secondary'} sm" data-nc-mode="manual">Nhập thủ công</button>
    </div>
    ${ncMode==="benhnhan"?`<div class="grid cols-2" style="margin-bottom:10px;"><label>Chọn bệnh nhân<select id="nc-benhnhan">${bnOptions}</select></label></div>`:""}
    <div style="font-weight:600;margin:4px 0;">Chỉ số nhân trắc & vận động</div>
    <div class="grid cols-3">
      ${sel("gioi_tinh","Giới tính",`<option value="nu" ${p.gioi_tinh!=="nam"?"selected":""}>Nữ</option><option value="nam" ${p.gioi_tinh==="nam"?"selected":""}>Nam</option>`)}
      ${I("tuoi","Tuổi")}
      ${I("can_nang_kg","Cân nặng hiện tại (kg)","number",'step="0.1"')}
      ${I("chieu_cao_cm","Chiều cao (cm)","number",'step="0.1"')}
      ${I("bmr_inbody","BMR InBody (kcal/ngày, nếu có)","number",'step="1" min="0"')}
      ${sel("muc_do_van_dong","Mức độ vận động / lao động",palOpts(p.muc_do_van_dong||"vua"),"sel-dai")}
      ${sel("muc_tap","Loại vận động / cường độ",tapOpts(p.muc_tap||"khong"),"sel-dai")}
      ${I("tap_phut","Thời gian/buổi (phút)","number",'step="5" min="0"')}
      ${I("tap_buoi","Tần suất (buổi/tuần)","number",'step="1" min="0" max="7"')}
    </div>
    <div style="font-weight:600;margin:12px 0 4px;">Mục tiêu & kế hoạch</div>
    <div class="grid cols-3">
      ${sel("muc_tieu_can_nang","Mục tiêu cân nặng",optsOf(MUC_TIEU_CAN,p.muc_tieu_can_nang||"giu",v=>v.label))}
      ${sel("loai_can_nang_ke_hoach","Loại cân nặng cho kế hoạch đạm",optsOf(LOAI_CAN_KH,p.loai_can_nang_ke_hoach||"ly_tuong"))}
      ${sel("he_so_hieu_chinh","Hệ số hiệu chỉnh (nếu chọn CN hiệu chỉnh)",[["0.25","0,25 (KDOQI)"],["0.4","0,4 (TCBP)"]].map(([v,t])=>`<option value="${v}" ${String(p.he_so_hieu_chinh||0.25)===v?"selected":""}>${t}</option>`).join(""))}
      ${sel("giai_doan_benh","Giai đoạn bệnh thận (nếu có)",optsOf(GIAI_DOAN_BENH_LABEL,p.giai_doan_benh||"chua_loc_may"))}
      ${I("dam_gkg","Đạm g/kg (để trống = trung điểm khuyến nghị)","number",'step="0.05" placeholder="vd: 0.8"')}
      ${I("ty_le_glucid","% Glucid (để trống = tạm "+NC_MACDINH_G+"%, có bệnh thận "+NC_MACDINH_G_THAN+"%)","number",'step="1" placeholder="vd: 55"')}
    </div>
    <div class="hint" style="margin:10px 0 4px;">Bệnh lý kèm theo:</div>
    <div class="row" style="gap:6px 16px;">${chk("benh_ly_kem",BENH_LY_KEM_LABEL)}</div>
    <div class="cd-wrap cd-scope" style="margin-top:12px;">
      <div class="cd-lbl">Chế độ đối tượng</div>
      <div class="cd-chips" id="nc-doituong">
        <label class="cd-tg ${ncDoiTuongOf(p)==="tre_em"?"on":""}" data-nc-dt="tre_em" title="Công thức theo cân nặng, nước theo cân nặng, đạm theo tuổi"><span>Trẻ em (&lt;${NC_TRE_EM_TUOI} tuổi)</span></label>
        <label class="cd-tg ${ncDoiTuongOf(p)==="cao_tuoi"?"on":""}" data-nc-dt="cao_tuoi" title="Đối chiếu bảng RDA ≥65 tuổi, đạm 0,93 g/kg nếu chưa bệnh thận"><span>Người cao tuổi (≥${NC_CAO_TUOI_TUOI} tuổi)</span></label>
      </div>
    </div>
    <div class="hint" style="margin:8px 0 4px;">Tình trạng đặc biệt khác:</div>
    <div class="row" style="gap:6px 16px;">${chk("tinh_trang_dac_biet",{mang_thai:"Mang thai",cho_con_bu:"Cho con bú"})}</div>
    <details style="margin-top:10px;" ${Object.values(p.xet_nghiem||{}).some(x=>x!==""&&x!=null)?"open":""}><summary style="cursor:pointer;font-weight:600;">Chỉ số xét nghiệm</summary>
      <div class="grid cols-4" style="margin-top:8px;">${NC_XN_TRUONG.map(([k,l,st])=>`<label>${l}<input data-nc-xn="${k}" type="number" step="${st}" value="${(p.xet_nghiem&&p.xet_nghiem[k])||""}"></label>`).join("")}</div>
    </details>
  </div>
  <div id="nc-kq">${ncRenderKetQua()}</div>
  <div class="banner info" style="margin-top:12px;">Cách tính giống phần Hồ sơ bệnh nhân ở tab Xây dựng thực đơn (Harris-Benedict hiệu chỉnh, đạm theo giai đoạn KDOQI × cân nặng kế hoạch). Số ở đây là gợi ý để chuyên gia xem xét — không thay thế chỉ định của bác sĩ.</div>`;
}
function wireNhuCau(){
  const kq = ()=>{ ncApXem=false; const el=document.getElementById("nc-kq"); if(el) el.innerHTML = ncRenderKetQua(); wireNcKq(); };
  document.querySelectorAll("[data-nc-mode]").forEach(b=>b.addEventListener("click",()=>{ ncMode=b.dataset.ncMode; ncIn=null; render(); }));
  document.getElementById("nc-benhnhan")?.addEventListener("change",e=>{ ncBenhNhanId=e.target.value; ncIn=null; render(); });
  document.querySelectorAll("[data-nc-f]").forEach(el=>{
    const upd = ()=>{ const k=el.dataset.ncF; let v=el.value;
      if(el.type==="number" || el.dataset.num) v = v==="" ? "" : (parseFloat(String(v).replace(",","."))||0);
      if(k==="he_so_hieu_chinh") v=parseFloat(v)||0.25;
      ncIn[k]=v; kq(); };
    el.addEventListener(el.tagName==="SELECT"?"change":"input", upd);
  });
  document.querySelectorAll("[data-nc-dt]").forEach(el=>el.addEventListener("click",e=>{
    e.preventDefault();
    const k = el.dataset.ncDt, hien = ncDoiTuongOf(ncIn);
    const t = (ncIn.tinh_trang_dac_biet||[]).filter(x=>x!=="tre_em" && x!=="cao_tuoi");
    if(hien!==k) t.push(k);
    ncIn.tinh_trang_dac_biet = t;
    document.querySelectorAll("[data-nc-dt]").forEach(x=>x.classList.toggle("on", x.dataset.ncDt===ncDoiTuongOf(ncIn)));
    kq();
  }));
  document.querySelectorAll("[data-nc-chk]").forEach(el=>el.addEventListener("change",()=>{
    const k=el.dataset.ncChk, s=new Set(ncIn[k]||[]); el.checked ? s.add(el.value) : s.delete(el.value); ncIn[k]=[...s]; kq(); }));
  document.querySelectorAll("[data-nc-xn]").forEach(el=>el.addEventListener("input",()=>{
    ncIn.xet_nghiem = ncIn.xet_nghiem||{}; ncIn.xet_nghiem[el.dataset.ncXn]=el.value; kq(); }));
  wireNcKq();
}
function wireNcKq(){
  document.getElementById("btn-nc-laylai")?.addEventListener("click",()=>{ ncIn=null; render(); });
  document.getElementById("btn-nc-apdung")?.addEventListener("click",()=>{ ncApXem=true; document.getElementById("nc-kq").innerHTML = ncRenderKetQua(); wireNcKq(); });
  document.getElementById("btn-nc-huy")?.addEventListener("click",()=>{ ncApXem=false; document.getElementById("nc-kq").innerHTML = ncRenderKetQua(); wireNcKq(); });
  document.getElementById("btn-nc-xacnhan")?.addEventListener("click",()=>{
    const bnCu = state.benhnhan.find(b=>b.id===ncBenhNhanId);
    if(!bnCu){ banner("Không tìm thấy hồ sơ bệnh nhân.","danger"); return; }
    if(ncKhacHoSo().length){ banner("Các chỉ số đang nhập khác hồ sơ — chưa thể áp dụng.","danger"); return; }
    const o = nhuCauChiTiet(ncIn).out;
    if(o.target_energy==null){ banner("Chưa đủ dữ liệu để tạo mục tiêu.","danger"); return; }
    const payload = JSON.parse(JSON.stringify(bnCu));
    NC_AP_TRUONG.forEach(([k])=>{ if(o[k]!=null) payload[k]=o[k]; });
    NC_AP_CAIDAT.forEach(k=>{ if(ncIn[k]!==undefined) payload[k]=ncIn[k]; });
    chotMocMtVaoPayload(payload, bnCu, homNay());
    const idx = state.benhnhan.findIndex(b=>b.id===ncBenhNhanId);
    state.benhnhan[idx]=payload;
    persistOne("benhnhan", payload);
    ncIn = JSON.parse(JSON.stringify(payload)); ncApXem=false;
    banner("Đã ghi mục tiêu dinh dưỡng vào hồ sơ "+payload.ten+" (số cũ được lưu vào lịch sử mục tiêu).","info");
    render();
  });
}

