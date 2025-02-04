import { mdiAlertCircle, mdiHomeAssistant, mdiInformation, mdiOpenInNew } from "@mdi/js";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@polymer/paper-item/paper-icon-item";
import "@polymer/paper-item/paper-item-body";
import "@material/mwc-button/mwc-button";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { isComponentLoaded } from "../../homeassistant-frontend/src/common/config/is_component_loaded";
import { navigate } from "../../homeassistant-frontend/src/common/navigate";
import { computeRTL } from "../../homeassistant-frontend/src/common/util/compute_rtl";
import "../../homeassistant-frontend/src/components/ha-alert";
import "../../homeassistant-frontend/src/components/ha-card";
import "../../homeassistant-frontend/src/components/ha-menu-button";
import "../../homeassistant-frontend/src/components/ha-svg-icon";
import "../../homeassistant-frontend/src/layouts/ha-app-layout";
import "../../homeassistant-frontend/src/panels/config/dashboard/ha-config-navigation";
import "../../homeassistant-frontend/src/panels/config/ha-config-section";
import { haStyle } from "../../homeassistant-frontend/src/resources/styles";
import { HomeAssistant, Route } from "../../homeassistant-frontend/src/types";
import { showDialogAbout } from "../components/dialogs/hacs-about-dialog";
import { Message, Repository, sortRepositoriesByName } from "../data/common";
import { Hacs } from "../data/hacs";
import { HacsStyles } from "../styles/hacs-common-style";
import { getMessages } from "../tools/get-messages";

@customElement("hacs-entry-panel")
export class HacsEntryPanel extends LitElement {
  @property({ attribute: false }) public hacs!: Hacs;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public isWide!: boolean;

  @property({ type: Boolean }) public narrow!: boolean;

  protected render(): TemplateResult | void {
    const updates: Repository[] = [];
    const messages: Message[] = [];
    const allMessages: Message[] = getMessages(this.hacs);

    this.hacs.repositories.forEach((repo) => {
      if (repo.pending_upgrade) {
        updates.push(repo);
      }
    });

    allMessages.forEach((message) => {
      messages.push({
        iconPath: mdiAlertCircle,
        name: message.name,
        info: message.info,
        secondary: message.secondary,
        path: message.path || "",
        severity: message.severity,
        dialog: message.dialog,
        repository: message.repository,
      });
    });

    this.dispatchEvent(
      new CustomEvent("update-hacs", {
        detail: { messages, updates },
        bubbles: true,
        composed: true,
      })
    );

    const content = html`
      <ha-config-section .narrow=${this.narrow} .isWide=${this.isWide}>
        <div slot="header">${this.narrow ? "HACS" : "Home Assistant Community Store"}</div>

        <div slot="introduction">
          ${this.hacs.messages?.length !== 0
            ? this.hacs.messages.map(
                (message) =>
                  html`
                    <ha-alert
                      .alertType=${message.severity!}
                      .title=${message.secondary
                        ? `${message.name} - ${message.secondary}`
                        : message.name}
                      .rtl=${computeRTL(this.hass)}
                    >
                      ${message.info}
                      <mwc-button
                        slot="action"
                        .label=${message.path
                          ? this.hacs.localize("common.navigate")
                          : message.dialog
                          ? this.hacs.localize(`common.${message.dialog}`)
                          : ""}
                        @click=${() =>
                          message.path ? navigate(message.path) : this._openDialog(message)}
                      >
                      </mwc-button>
                    </ha-alert>
                  `
              )
            : !this.narrow
            ? this.hacs.localize("entry.intro")
            : ""}
        </div>

        ${this.hacs.updates?.length !== 0
          ? html` <ha-card>
              ${sortRepositoriesByName(this.hacs.updates).map(
                (repository) =>
                  html`
                    <ha-alert .title=${repository.name} .rtl=${computeRTL(this.hass)}>
                      ${this.hacs.localize("sections.pending_repository_upgrade", {
                        downloaded: repository.installed_version,
                        available: repository.available_version,
                      })}
                      <mwc-button
                        slot="action"
                        .label=${this.hacs.localize("common.update")}
                        @click=${() => this._openUpdateDialog(repository)}
                      >
                      </mwc-button>
                    </ha-alert>
                  `
              )}
            </ha-card>`
          : ""}

        <ha-card>
          <ha-config-navigation .hass=${this.hass} .pages=${this.hacs.sections}>
          </ha-config-navigation>
        </ha-card>

        <ha-card>
          ${isComponentLoaded(this.hass, "hassio")
            ? html`
                <paper-icon-item @click=${this._openSupervisorDialog}>
                  <ha-svg-icon .path=${mdiHomeAssistant} slot="item-icon"></ha-svg-icon>
                  <paper-item-body two-line>
                    ${this.hacs.localize(`sections.addon.title`)}
                    <div secondary>${this.hacs.localize(`sections.addon.description`)}</div>
                  </paper-item-body>
                  <ha-svg-icon right .path=${mdiOpenInNew}></ha-svg-icon>
                </paper-icon-item>
              `
            : ""}
        </ha-card>

        <ha-card>
          <paper-icon-item @click=${this._openAboutDialog}>
            <ha-svg-icon .path=${mdiInformation} slot="item-icon"></ha-svg-icon>
            <paper-item-body two-line>
              ${this.hacs.localize(`sections.about.title`)}
              <div secondary>${this.hacs.localize(`sections.about.description`)}</div>
            </paper-item-body>
          </paper-icon-item>
        </ha-card>
      </ha-config-section>
    `;

    if (!this.narrow && this.hass.dockedSidebar !== "always_hidden") {
      return content;
    }

    return html`
      <ha-app-layout>
        <app-header fixed slot="header">
          <app-toolbar>
            <ha-menu-button .hass=${this.hass} .narrow=${this.narrow}></ha-menu-button>
          </app-toolbar>
        </app-header>
        ${content}
      </ha-app-layout>
    `;
  }

  private _openDialog(message: Message) {
    if (!message.dialog) {
      return;
    }
    if (message.dialog == "remove") {
      message.dialog = "removed";
    }
    this.dispatchEvent(
      new CustomEvent("hacs-dialog", {
        detail: {
          type: message.dialog,
          repository: message.repository,
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _openUpdateDialog(repository: Repository) {
    this.dispatchEvent(
      new CustomEvent("hacs-dialog", {
        detail: {
          type: "update",
          repository: repository.id,
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  private async _openAboutDialog() {
    showDialogAbout(this, this.hacs);
  }

  private async _openSupervisorDialog() {
    this.dispatchEvent(
      new CustomEvent("hacs-dialog", {
        detail: {
          type: "navigate",
          path: "/hassio",
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      HacsStyles,
      css`
        paper-icon-item {
          cursor: pointer;
        }

        app-header {
          --app-header-background-color: var(--primary-background-color);
        }

        ha-svg-icon {
          color: var(--secondary-text-color);
        }

        ha-config-section {
          color: var(--primary-text-color);
          margin-top: -12px;
        }

        paper-item-body {
          width: 100%;
          min-height: var(--paper-item-body-two-line-min-height, 72px);
          display: var(--layout-vertical_-_display);
          flex-direction: var(--layout-vertical_-_flex-direction);
          justify-content: var(--layout-center-justified_-_justify-content);
        }
        paper-item-body,
        ha-menu-button {
          color: var(--hcv-text-color-primary);
        }
        paper-item-body div {
          font-size: 14px;
          color: var(--hcv-text-color-secondary);
        }
        div[secondary] {
          white-space: normal;
        }
      `,
    ];
  }
}
