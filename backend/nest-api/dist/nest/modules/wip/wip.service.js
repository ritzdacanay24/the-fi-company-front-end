"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WipService = void 0;
const common_1 = require("@nestjs/common");
const odbc_1 = __importDefault(require("odbc"));
function pick(obj, ...keys) {
    for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            return obj[key];
        }
    }
    const lower = Object.fromEntries(Object.entries(obj).map(([k, v]) => [k.toLowerCase(), v]));
    for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(lower, key.toLowerCase())) {
            return lower[key.toLowerCase()];
        }
    }
    return null;
}
let WipService = class WipService {
    qadConnStr() {
        const dsn = process.env.QAD_DSN || 'DEV';
        const user = process.env.QAD_USER || 'change_me';
        const password = process.env.QAD_PASSWORD || 'change_me';
        return `DSN=${dsn};UID=${user};PWD=${password}`;
    }
    async getWipReport(limit) {
        const sql = `
      select wo_nbr id
      , wo_nbr
      , wo_wip_tot wo_wip_tot
      , wo_so_job
      , wo_routing
      , wo_rel_date
      , wo_qty_ord
      , wo_qty_comp
      , wo_need_date
      , wo_line
      , wo_due_date
      , wo_part
      , wo_status
      from wo_mstr
      left join (
        select
          sum(wod_qty_req - wod_qty_iss) open_qty,
          sum((wod_qty_req) * wod_bom_amt) total_amount,
          sum(((wod_qty_req-wod_qty_iss) * wod_bom_amt)-wod_mvrte_accr) total_open_amount,
          wod_nbr,
          sum(wod_qty_iss) wod_qty_iss
        from wod_det
        where wod_domain = 'EYE'
        group by wod_nbr
      ) a ON a.wod_nbr = wo_mstr.wo_nbr
      where wo_domain = 'EYE'
      and wo_wip_tot > 0
      order by wo_due_date DESC
    `;
        let conn = null;
        try {
            conn = await odbc_1.default.connect(this.qadConnStr());
            const rows = (await conn.query(sql));
            const normalized = rows.map((row) => ({
                ...row,
                id: pick(row, 'wo_nbr', 'WO_NBR') ?? pick(row, 'id', 'ID'),
            }));
            if (limit > 0) {
                return normalized.slice(0, limit);
            }
            return normalized;
        }
        finally {
            if (conn) {
                await conn.close();
            }
        }
    }
};
exports.WipService = WipService;
exports.WipService = WipService = __decorate([
    (0, common_1.Injectable)()
], WipService);
//# sourceMappingURL=wip.service.js.map