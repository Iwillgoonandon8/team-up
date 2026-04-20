import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FeishuClient } from './feishu.client';

type FeishuResp<T> = {
  code: number;
  msg: string;
  data: T;
};

type BitableRecord = {
  record_id: string;
  fields: Record<string, unknown>;
};

@Injectable()
export class BitableService {
  constructor(
    private readonly config: ConfigService,
    private readonly client: FeishuClient
  ) {}

  private getAppToken(): string {
    const appToken = this.config.get<string>('FEISHU_APP_TOKEN');
    if (!appToken) {
      throw new InternalServerErrorException('Missing FEISHU_APP_TOKEN');
    }
    return appToken;
  }

  async createRecord(tableId: string, fields: Record<string, unknown>): Promise<string> {
    const appToken = this.getAppToken();
    const result = await this.client.post<FeishuResp<{ record: { record_id: string } }>>(
      `/bitable/v1/apps/${appToken}/tables/${tableId}/records`,
      { fields }
    );

    if (result.code !== 0) {
      throw new InternalServerErrorException(`Feishu create record failed: ${result.msg}`);
    }

    return result.data.record.record_id;
  }

  async listRecords(
    tableId: string,
    pageSize = 50,
    pageToken?: string
  ): Promise<{
    items: BitableRecord[];
    hasMore: boolean;
    pageToken?: string;
  }> {
    const appToken = this.getAppToken();
    const result = await this.client.get<
      FeishuResp<{
        has_more: boolean;
        page_token?: string;
        items: BitableRecord[];
      }>
    >(`/bitable/v1/apps/${appToken}/tables/${tableId}/records`, {
      page_size: pageSize,
      page_token: pageToken
    });

    if (result.code !== 0) {
      throw new InternalServerErrorException(`Feishu list records failed: ${result.msg}`);
    }
    const safeItems = Array.isArray(result.data?.items) ? result.data.items : [];
    const hasMore = Boolean(result.data?.has_more);
    const nextPageToken = result.data?.page_token;

    return {
      items: safeItems,
      hasMore,
      pageToken: nextPageToken
    };
  }

  async listAllRecords(tableId: string): Promise<BitableRecord[]> {
    const all: BitableRecord[] = [];
    let pageToken: string | undefined;

    do {
      const page = await this.listRecords(tableId, 200, pageToken);
      all.push(...page.items);
      pageToken = page.hasMore ? page.pageToken : undefined;
    } while (pageToken);

    return all;
  }

  async updateRecord(
    tableId: string,
    recordId: string,
    fields: Record<string, unknown>
  ): Promise<void> {
    const appToken = this.getAppToken();
    const result = await this.client.put<FeishuResp<{ record: BitableRecord }>>(
      `/bitable/v1/apps/${appToken}/tables/${tableId}/records/${recordId}`,
      { fields }
    );

    if (result.code !== 0) {
      throw new InternalServerErrorException(`Feishu update record failed: ${result.msg}`);
    }
  }
}
