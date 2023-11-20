import { tracked } from "@glimmer/tracking";
import Controller from "@ember/controller";
import { action } from "@ember/object";
import { inject as service } from "@ember/service";
import BulkSelectHelper from "discourse/lib/bulk-select-helper";
import { filterTypeForMode } from "discourse/lib/filter-mode";
import { disableImplicitInjections } from "discourse/lib/implicit-injections";
import { defineTrackedProperty } from "discourse/lib/tracked-tools";

// Just add query params here to have them automatically passed to topic list filters.
export const queryParams = {
  order: { replace: true, refreshModel: true },
  ascending: { replace: true, refreshModel: true, default: false },
  status: { replace: true, refreshModel: true },
  state: { replace: true, refreshModel: true },
  search: { replace: true, refreshModel: true },
  max_posts: { replace: true, refreshModel: true },
  min_posts: { replace: true, refreshModel: true },
  q: { replace: true, refreshModel: true },
  before: { replace: true, refreshModel: true },
  bumped_before: { replace: true, refreshModel: true },
  f: { replace: true, refreshModel: true },
  subset: { replace: true, refreshModel: true },
  period: { replace: true, refreshModel: true },
  topic_ids: { replace: true, refreshModel: true },
  group_name: { replace: true, refreshModel: true },
  tags: { replace: true, refreshModel: true },
  match_all_tags: { replace: true, refreshModel: true },
  no_subcategories: { replace: true, refreshModel: true },
  no_tags: { replace: true, refreshModel: true },
  exclude_tag: { replace: true, refreshModel: true },
};

export function resetParams(skipParams = []) {
  for (const [param, value] of Object.entries(queryParams)) {
    if (!skipParams.includes(param)) {
      this.controller.set(param, value.default);
    }
  }
}

export function addDiscoveryQueryParam(p, opts) {
  queryParams[p] = opts;
}

@disableImplicitInjections
export default class DiscoveryListController extends Controller {
  @service composer;
  @service siteSettings;
  @service site;
  @service currentUser;

  @tracked model;

  queryParams = Object.keys(queryParams);

  bulkSelectHelper = new BulkSelectHelper(this);

  constructor() {
    super(...arguments);
    for (const [name, info] of Object.entries(queryParams)) {
      defineTrackedProperty(this, name, info.default);
    }
  }

  get canBulkSelect() {
    return (
      this.currentUser?.canManageTopic ||
      this.showDismissRead ||
      this.showResetNew
    );
  }

  get showDismissRead() {
    return (
      filterTypeForMode(this.model.list?.filter) === "unread" &&
      this.model.list.get("topics.length") > 0
    );
  }

  get showResetNew() {
    return (
      filterTypeForMode(this.model.list?.filter) === "new" &&
      this.model.list?.get("topics.length") > 0
    );
  }

  get createTopicTargetCategory() {
    const { category } = this.model;
    if (category?.canCreateTopic) {
      return category;
    }

    if (this.siteSettings.default_subcategory_on_read_only_category) {
      return category?.subcategoryWithCreateTopicPermission;
    }
  }

  get createTopicDisabled() {
    // We are in a category route, but user does not have permission for the category
    return this.model.category && !this.createTopicTargetCategory;
  }

  get resolvedAscending() {
    return (
      (this.ascending ?? this.model.list.get("params.ascending")) === "true"
    );
  }

  get resolvedOrder() {
    return this.order ?? this.model.list.get("params.order") ?? "activity";
  }

  @action
  createTopic() {
    this.composer.openNewTopic({
      category: this.createTopicTargetCategory,
      tags: [this.model.tag?.id, ...(this.model.additionalTags ?? [])]
        .filter(Boolean)
        .reject((t) => ["none", "all"].includes(t))
        .join(","),
      preferDraft: true,
    });
  }

  @action
  changePeriod(p) {
    this.period = p;
  }

  @action
  changeSort(sortBy) {
    if (sortBy === this.resolvedOrder) {
      this.ascending = !this.resolvedAscending;
    } else {
      this.ascending = false;
    }
    this.order = sortBy;
  }

  @action
  changeNewListSubset(subset) {
    this.subset = subset;
    this.model.list.updateNewListSubsetParam(subset);
  }

  @action
  toggleTagInfo() {
    this.toggleProperty("showTagInfo");
  }
}
