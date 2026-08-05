import axios from "axios";
import { environment } from "../config/environment";

export const http = axios.create({
  baseURL: environment.apiBaseUrl,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});
