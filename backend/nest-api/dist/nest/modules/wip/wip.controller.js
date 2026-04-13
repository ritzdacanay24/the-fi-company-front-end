"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WipController = void 0;
const common_1 = require("@nestjs/common");
const wip_service_1 = require("./wip.service");
let WipController = class WipController {
    wipService;
    constructor(wipService) {
        this.wipService = wipService;
    }
    async getWipReport(limitRaw) {
        const raw = Number(limitRaw || 0);
        const limit = Number.isFinite(raw) ? Math.max(0, Math.min(raw, 500)) : 0;
        try {
            return await this.wipService.getWipReport(limit);
        }
        catch (err) {
            const error = err instanceof Error ? err.message : String(err);
            throw new common_1.InternalServerErrorException({
                ok: false,
                endpoint: '/api/WipReport/index',
                error,
            });
        }
    }
    async getWipReportCompat(limitRaw) {
        return this.getWipReport(limitRaw);
    }
};
exports.WipController = WipController;
__decorate([
    (0, common_1.Get)('api/WipReport/index'),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WipController.prototype, "getWipReport", null);
__decorate([
    (0, common_1.Get)('server/ApiV2/WipReport/index'),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WipController.prototype, "getWipReportCompat", null);
exports.WipController = WipController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [wip_service_1.WipService])
], WipController);
//# sourceMappingURL=wip.controller.js.map