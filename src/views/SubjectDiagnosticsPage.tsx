import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, AlertTriangle, Brain } from "lucide-react";
import { useCardData, useCategoryData, useReviewData, useCardActions, useUIContext } from "@/contexts/AppContext";
import { 