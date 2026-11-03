import { errorResponse } from "../api/_utils";

// Old deployments and edge caches may still contain files that used to live
// under public/data. Deny them at the routing layer as well as omitting them
// from the current static asset bundle.
export const onRequest: PagesFunction = async () =>
  errorResponse("Không tìm thấy học liệu công khai.", 404);
