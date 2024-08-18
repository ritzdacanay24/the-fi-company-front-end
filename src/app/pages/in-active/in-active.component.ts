import { Component } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { MenuService } from "@app/core/api/menu/menu.service";
import { PageAccessService } from "@app/core/api/page-access/page-access.service";
import { AuthenticationService } from "@app/core/services/auth.service";
import { MENU } from "@app/layouts/sidebar/menu";
import { SharedModule } from "@app/shared/shared.module";

export const findItemNested = (itemId, arr = MENU) =>
  arr.reduce((a, item) => {
    if (a) return a;
    if (item.link === itemId) {
      return item;
    }
    let nestingKey = "subItems";
    if (item[nestingKey]) {
      return findItemNested(itemId, item[nestingKey]);
    }
  }, null);

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: "app-in-active",
  templateUrl: "./in-active.component.html",
  styleUrls: ["./in-active.component.scss"],
})
export class InActiveComponent {
  constructor(
    private activatedRoute: ActivatedRoute,
    private router: Router,
    public authenticationService: AuthenticationService,
    public pageAccessService: PageAccessService,
    private menuService: MenuService
  ) {}

  title;
  returnUrl;
  menu_id;
  disableRunData;

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.title = params["title"];
      this.returnUrl = params["returnUrl"];
      this.menu_id = params["menu_id"];

      //need a way to disable this if canactivate already ran. 
      this.checkAccess();
      //this.getById();
    });
  }

  async getById() {
    let res = await this.menuService.checkUserPermission(
      this.authenticationService.currentUserValue.id,
      this.menu_id
    );
    if (res && !res.accessRequired) {
      this.refresh();
    } else {
      this.checkAccess();
    }
  }

  isLoading = false;
  refresh() {
    this.isLoading = true;
    this.router.navigateByUrl(this.returnUrl).then(() => {
      // Do something
      this.isLoading = false;
    });
  }

  async request_access() {
    try {
      this.isLoading = true;
      await this.checkAccess();

      if (this.data && this.data.active == 1) {
        this.refresh();
      } else {
        if (!this.data) {
          await this.pageAccessService.requestAccess(
            this.authenticationService.currentUserValue.id,
            this.menu_id
          );
          await this.checkAccess();
        }
      }

      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;
    }
  }

  data;

  async checkAccess() {
    try {
      this.data = await this.pageAccessService.findOne({
        user_id: this.authenticationService.currentUserValue.id,
        menu_id: this.menu_id,
      });

      if (this.data && this.data.active == 1) {
        this.refresh();
      }

    } catch (err) {}
  }
}
